import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope } from '../common/access';
import { slugify } from '../common/slug';
import {
  CreateBillingDto,
  CreateCenterDto,
  CreateYearPackageDto,
  UpdateBillingDto,
  UpdateCenterDto,
  UpdateCenterSettingsDto,
} from './dto/centers.dto';

const CENTER_INCLUDE = {
  centerSubjects: true,
  yearPackages: {
    include: { subjects: true, gradeGroups: true },
  },
  _count: {
    select: { studentProfiles: true, teacherProfiles: true, courses: true },
  },
} satisfies Prisma.CenterInclude;

@Injectable()
export class CentersService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(base: string) {
    let slug = slugify(base);
    let i = 1;
    while (await this.prisma.center.findUnique({ where: { slug } })) {
      slug = `${slugify(base)}-${++i}`;
    }
    return slug;
  }

  /** Center owner acts on their own center only. */
  private ownCenterId(actor: AuthUser, requested?: string): string | undefined {
    if (actor.role === Role.SUPER_ADMIN) return requested;
    if (actor.role === Role.CENTER_OWNER) return actor.centerId ?? undefined;
    return requested; // read-only roles
  }

  async create(actor: AuthUser, dto: CreateCenterDto) {
    if (actor.role !== Role.SUPER_ADMIN) {
      // a center owner creates their own center once
      if (actor.centerId) throw new ConflictException('Already owns a center');
    }
    const ownerId =
      actor.role === Role.SUPER_ADMIN ? dto.ownerId : actor.id;
    return this.prisma.$transaction(async (tx) => {
      const center = await tx.center.create({
        data: {
          name: dto.name,
          slug: await this.uniqueSlug(dto.slug ?? dto.name),
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          logo: dto.logo,
          ownerId,
          bundlePrice: dto.bundlePrice,
          maxStudentsPerClass: dto.maxStudentsPerClass ?? 30,
        },
      });
      // link the owner's user record to the new center
      await tx.user.update({
        where: { id: ownerId },
        data: { centerId: center.id },
      });
      return center;
    });
  }

  async list(actor: AuthUser) {
    const where: Prisma.CenterWhereInput = {};
    if (actor.role !== Role.SUPER_ADMIN) {
      // Non-admins only ever see their own center — without this every
      // authenticated role (students included) could list all centers.
      if (!actor.centerId) return [];
      where.id = actor.centerId;
    }
    return this.prisma.center.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            studentProfiles: true,
            teacherProfiles: true,
            courses: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(actor: AuthUser, id: string) {
    const center = await this.prisma.center.findUnique({
      where: { id },
      include: CENTER_INCLUDE,
    });
    if (!center) throw new NotFoundException('Center not found');
    if (
      actor.role === Role.CENTER_OWNER ||
      actor.role === Role.TEACHER ||
      actor.role === Role.STUDENT
    ) {
      assertCenterScope(actor, center.id);
    }
    const gradeGroups = await this.prisma.centerGradeGroup.findMany({
      where: { centerId: id, packageId: null },
    });
    return { ...center, gradeGroups };
  }

  async getBySlug(slug: string) {
    const center = await this.prisma.center.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        status: true,
      },
    });
    if (!center) throw new NotFoundException('Center not found');
    return center;
  }

  async update(actor: AuthUser, id: string, dto: UpdateCenterDto) {
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Center not found');
    assertCenterScope(actor, center.id);
    // only super admin flips status, slug or the platform fee
    const { status, monthlyFee, slug, ...rest } = dto;
    return this.prisma.center.update({
      where: { id },
      data: {
        ...rest,
        ...(actor.role === Role.SUPER_ADMIN && status && { status }),
        ...(actor.role === Role.SUPER_ADMIN &&
          monthlyFee !== undefined && { monthlyFee }),
        ...(actor.role === Role.SUPER_ADMIN &&
          slug !== undefined && { slug: await this.uniqueSlug(slug) }),
      },
    });
  }

  // ── Platform billing ──

  private assertSuperAdmin(actor: AuthUser) {
    if (actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin only');
    }
  }

  async listBillings(actor: AuthUser, id: string) {
    this.assertSuperAdmin(actor);
    return this.prisma.centerBilling.findMany({
      where: { centerId: id },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  /** Generate (or return existing) the billing for a given month. */
  async createBilling(actor: AuthUser, id: string, dto: CreateBillingDto) {
    this.assertSuperAdmin(actor);
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Center not found');
    const amount = dto.amount ?? center.monthlyFee ?? 0;
    if (amount <= 0) {
      throw new BadRequestException(
        'Set a monthly fee on the center or pass an amount',
      );
    }
    return this.prisma.centerBilling.upsert({
      where: {
        centerId_year_month: { centerId: id, year: dto.year, month: dto.month },
      },
      create: {
        centerId: id,
        year: dto.year,
        month: dto.month,
        amount,
        notes: dto.notes,
      },
      update: { amount, ...(dto.notes !== undefined && { notes: dto.notes }) },
    });
  }

  async updateBilling(
    actor: AuthUser,
    id: string,
    billingId: string,
    dto: UpdateBillingDto,
  ) {
    this.assertSuperAdmin(actor);
    const billing = await this.prisma.centerBilling.findUnique({
      where: { id: billingId },
    });
    if (!billing || billing.centerId !== id) {
      throw new NotFoundException('Billing not found');
    }
    return this.prisma.centerBilling.update({
      where: { id: billingId },
      data: {
        status: dto.status,
        paidAt: dto.status === BillingStatus.PAID ? new Date() : null,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async updateSettings(
    actor: AuthUser,
    id: string,
    dto: UpdateCenterSettingsDto,
  ) {
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Center not found');
    assertCenterScope(actor, center.id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.subjects) {
        await tx.centerSubject.deleteMany({ where: { centerId: id } });
        await tx.centerSubject.createMany({
          data: dto.subjects.map((s) => ({ ...s, centerId: id })),
        });
      }
      if (dto.groupsPerYear) {
        await tx.centerGradeGroup.deleteMany({
          where: { centerId: id, packageId: null },
        });
        await tx.centerGradeGroup.createMany({
          data: dto.groupsPerYear.map((g) => ({ ...g, centerId: id })),
        });
      }
      const updated = await tx.center.update({
        where: { id },
        data: {
          bundlePrice: dto.bundlePrice,
          maxStudentsPerClass: dto.maxStudentsPerClass,
        },
        include: CENTER_INCLUDE,
      });
      const gradeGroups = await tx.centerGradeGroup.findMany({
        where: { centerId: id, packageId: null },
      });
      return { ...updated, gradeGroups };
    });
  }

  async createYearPackage(
    actor: AuthUser,
    id: string,
    dto: CreateYearPackageDto,
  ) {
    const center = await this.prisma.center.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Center not found');
    assertCenterScope(actor, center.id);

    return this.prisma.centerYearPackage.create({
      data: {
        centerId: id,
        level: dto.level,
        grade: dto.grade,
        track: dto.track,
        teacherId: dto.teacherId,
        bundlePrice: dto.bundlePrice,
        maxStudentsPerClass: dto.maxStudentsPerClass,
        subjects: { create: dto.subjects },
        gradeGroups: { create: dto.groupsPerYear },
      },
      include: { subjects: true, gradeGroups: true },
    });
  }

  async deleteYearPackage(actor: AuthUser, id: string, packageId: string) {
    const pkg = await this.prisma.centerYearPackage.findUnique({
      where: { id: packageId },
    });
    if (!pkg || pkg.centerId !== id) {
      throw new NotFoundException('Package not found');
    }
    assertCenterScope(actor, pkg.centerId);
    await this.prisma.centerYearPackage.delete({ where: { id: packageId } });
    return { success: true };
  }

  async deactivate(actor: AuthUser, id: string) {
    if (actor.role !== Role.SUPER_ADMIN) {
      assertCenterScope(actor, id);
    }
    await this.prisma.center.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
    return { success: true };
  }
}
