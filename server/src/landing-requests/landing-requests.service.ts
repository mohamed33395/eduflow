import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateLandingRequestDto,
  UpdateLandingRequestStatusDto,
} from './landing-requests.dto';

@Injectable()
export class LandingRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public: a visitor submits the booking form on a landing page.
   * Course requests copy the course's centerId so the center owner also sees
   * them; orphan courses (no center) only reach their course owner.
   */
  async create(dto: CreateLandingRequestDto) {
    // Honeypot filled → silently pretend success so bots think it worked.
    if (dto.website) return { ok: true };

    let centerId: string | null = null;
    let courseId: string | null = null;

    if (dto.courseSlug) {
      const course = await this.prisma.course.findUnique({
        where: { slug: dto.courseSlug },
        select: { id: true, centerId: true },
      });
      if (!course) throw new NotFoundException('Course not found');
      courseId = course.id;
      centerId = course.centerId;
    } else if (dto.centerSlug) {
      const center = await this.prisma.center.findUnique({
        where: { slug: dto.centerSlug },
        select: { id: true },
      });
      if (!center) throw new NotFoundException('Center not found');
      centerId = center.id;
    } else {
      throw new BadRequestException('centerSlug or courseSlug is required');
    }

    const row = await this.prisma.landingRequest.create({
      data: {
        centerId,
        courseId,
        role: dto.role,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        message: dto.message,
      },
    });
    return { ok: true, id: row.id };
  }

  private scopeWhere(actor: AuthUser): Prisma.LandingRequestWhereInput {
    if (actor.role === Role.CENTER_OWNER) {
      return { centerId: actor.centerId ?? '__none__' };
    }
    if (actor.role === Role.COURSE_OWNER) {
      return {
        OR: [
          { courseId: actor.courseId ?? '__none__' },
          { course: { ownerId: actor.id } },
        ],
      };
    }
    return {};
  }

  list(actor: AuthUser) {
    return this.prisma.landingRequest.findMany({
      where: this.scopeWhere(actor),
      include: { course: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async assertScoped(actor: AuthUser, id: string) {
    const req = await this.prisma.landingRequest.findUnique({
      where: { id },
      include: { course: { select: { ownerId: true } } },
    });
    if (!req) throw new NotFoundException('Request not found');
    if (actor.role === Role.SUPER_ADMIN) return req;
    if (actor.role === Role.CENTER_OWNER && req.centerId === actor.centerId)
      return req;
    if (
      actor.role === Role.COURSE_OWNER &&
      (req.courseId === actor.courseId || req.course?.ownerId === actor.id)
    )
      return req;
    throw new ForbiddenException('Not your request');
  }

  async updateStatus(
    actor: AuthUser,
    id: string,
    dto: UpdateLandingRequestStatusDto,
  ) {
    await this.assertScoped(actor, id);
    return this.prisma.landingRequest.update({
      where: { id },
      data: { status: dto.status },
      include: { course: { select: { name: true, slug: true } } },
    });
  }

  async remove(actor: AuthUser, id: string) {
    await this.assertScoped(actor, id);
    await this.prisma.landingRequest.delete({ where: { id } });
    return { ok: true };
  }
}
