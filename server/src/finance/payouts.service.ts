import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CompensationType,
  PayoutStatus,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import {
  GeneratePayoutDto,
  ListPayoutsQuery,
  UpdatePayoutDto,
} from './dto/finance.dto';

const PAYOUT_INCLUDE = {
  teacher: {
    include: { user: { select: { id: true, name: true, username: true } } },
  },
  approvedBy: { select: { id: true, name: true } },
} satisfies Prisma.TeacherPayoutInclude;

@Injectable()
export class PayoutsService {
  constructor(private readonly prisma: PrismaService) {}

  private async scopeTeacher(actor: AuthUser, teacherId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    if (actor.role === Role.TEACHER && actor.id !== teacherId) {
      throw new BadRequestException('Not your account');
    }
    if (actor.role !== Role.TEACHER) {
      assertCenterScope(actor, profile.centerId);
    }
    return profile;
  }

  /**
   * Preview what a payout would look like — dry run, no writes.
   * collectedRevenue = sum(payments.paid) for the teacher's courses in period.
   */
  async preview(actor: AuthUser, teacherId: string, periodStart: string, periodEnd: string) {
    const profile = await this.scopeTeacher(actor, teacherId);
    return this.compute(profile, new Date(periodStart), new Date(periodEnd));
  }

  private async compute(
    profile: {
      id: string;
      compensationType: CompensationType;
      fixedAmount: number | null;
      commissionPercent: number | null;
    },
    periodStart: Date,
    periodEnd: Date,
  ) {
    const endOfDay = new Date(periodEnd);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Revenue from payments on courses this teacher teaches.
    const agg = await this.prisma.payment.aggregate({
      where: {
        createdAt: { gte: periodStart, lte: endOfDay },
        course: { teachers: { some: { id: profile.id } } },
      },
      _sum: { paid: true },
    });
    const collectedRevenue = agg._sum.paid ?? 0;

    const dueAmount =
      profile.compensationType === CompensationType.FIXED
        ? (profile.fixedAmount ?? 0)
        : collectedRevenue * ((profile.commissionPercent ?? 0) / 100);

    return {
      teacherId: profile.id,
      periodStart,
      periodEnd: endOfDay,
      compensationType: profile.compensationType,
      fixedAmount: profile.fixedAmount,
      commissionPercent: profile.commissionPercent,
      collectedRevenue,
      dueAmount: Math.round(dueAmount * 100) / 100,
    };
  }

  /** Create (generate) the payout record for a period. */
  async generate(actor: AuthUser, dto: GeneratePayoutDto) {
    const profile = await this.scopeTeacher(actor, dto.teacherId);
    const periodStart = new Date(dto.periodStart);
    const exists = await this.prisma.teacherPayout.findUnique({
      where: {
        teacherId_periodStart: { teacherId: dto.teacherId, periodStart },
      },
    });
    if (exists) {
      throw new ConflictException('Payout for this period already exists');
    }
    const computed = await this.compute(
      profile,
      periodStart,
      new Date(dto.periodEnd),
    );
    return this.prisma.teacherPayout.create({
      data: {
        teacherId: dto.teacherId,
        periodStart: computed.periodStart,
        periodEnd: computed.periodEnd,
        compensationType: computed.compensationType,
        fixedAmount: computed.fixedAmount,
        commissionPercent: computed.commissionPercent,
        collectedRevenue: computed.collectedRevenue,
        dueAmount: computed.dueAmount,
        notes: dto.notes,
      },
      include: PAYOUT_INCLUDE,
    });
  }

  async list(actor: AuthUser, query: ListPayoutsQuery) {
    const where: Prisma.TeacherPayoutWhereInput = {};
    if (actor.role === Role.TEACHER) {
      where.teacherId = actor.id;
    } else {
      if (query.teacherId) where.teacherId = query.teacherId;
      const centerId = centerFilter(actor);
      if (centerId) where.teacher = { centerId };
    }
    if (query.status) where.status = query.status;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.teacherPayout.findMany({
        where,
        relationLoadStrategy: 'join',
        include: PAYOUT_INCLUDE,
        orderBy: { periodStart: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.teacherPayout.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async get(actor: AuthUser, id: string) {
    const payout = await this.prisma.teacherPayout.findUnique({
      where: { id },
      relationLoadStrategy: 'join',
      include: PAYOUT_INCLUDE,
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (actor.role === Role.TEACHER && payout.teacherId !== actor.id) {
      throw new BadRequestException('Not your payout');
    }
    if (actor.role !== Role.TEACHER && actor.role !== Role.SUPER_ADMIN) {
      assertCenterScope(actor, payout.teacher.centerId);
    }
    return payout;
  }

  /** Admin moves status PENDING → APPROVED → PAID. */
  async update(actor: AuthUser, id: string, dto: UpdatePayoutDto) {
    const payout = await this.prisma.teacherPayout.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    assertCenterScope(actor, payout.teacher.centerId);

    const next = dto.status;
    if (next) {
      const order: PayoutStatus[] = [
        PayoutStatus.PENDING,
        PayoutStatus.APPROVED,
        PayoutStatus.PAID,
      ];
      if (order.indexOf(next) <= order.indexOf(payout.status)) {
        throw new BadRequestException(
          `Cannot move status from ${payout.status} to ${next}`,
        );
      }
    }
    return this.prisma.teacherPayout.update({
      where: { id },
      data: {
        status: next,
        notes: dto.notes,
        approvedById: next ? actor.id : undefined,
        paidAt: next === PayoutStatus.PAID ? new Date() : undefined,
      },
      include: PAYOUT_INCLUDE,
    });
  }

  async remove(actor: AuthUser, id: string) {
    const payout = await this.prisma.teacherPayout.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    assertCenterScope(actor, payout.teacher.centerId);
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException('Only pending payouts can be deleted');
    }
    await this.prisma.teacherPayout.delete({ where: { id } });
    return { success: true };
  }
}
