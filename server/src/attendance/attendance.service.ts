import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import {
  ListAttendanceQuery,
  MarkAttendanceDto,
  UpdateAttendanceDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bulk-mark attendance for a date (upserts per user/date/course). */
  async mark(actor: AuthUser, dto: MarkAttendanceDto) {
    if (actor.role === Role.TEACHER && dto.courseId) {
      const teaches = await this.prisma.course.count({
        where: { id: dto.courseId, teachers: { some: { id: actor.id } } },
      });
      if (!teaches) throw new ForbiddenException('Not your course');
    }
    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: { centerId: true },
      });
      if (!course) throw new NotFoundException('Course not found');
      if (actor.role !== Role.TEACHER) {
        assertCenterScope(actor, course.centerId);
      }
    }
    if (!dto.courseId && actor.role !== Role.SUPER_ADMIN) {
      // Course-less entries (center check-in): scope to the actor's center.
      const users = await this.prisma.user.findMany({
        where: { id: { in: dto.entries.map((e) => e.userId) } },
        select: { centerId: true },
      });
      for (const u of users) assertCenterScope(actor, u.centerId);
    }
    const date = dto.date ? new Date(dto.date) : new Date();
    date.setUTCHours(0, 0, 0, 0);

    const ops = dto.entries.map((e) =>
      this.prisma.attendanceRecord.create({
        data: {
          userId: e.userId,
          courseId: dto.courseId,
          date,
          status: e.status,
        },
      }),
    );
    return this.prisma.$transaction(ops);
  }

  async update(actor: AuthUser, id: string, dto: UpdateAttendanceDto) {
    if (actor.role === Role.STUDENT) {
      throw new ForbiddenException('Students cannot edit attendance');
    }
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: { course: { select: { centerId: true } } },
    });
    if (!record) throw new NotFoundException('Record not found');
    if (actor.role === Role.TEACHER) {
      const teaches = record.courseId
        ? await this.prisma.course.count({
            where: { id: record.courseId, teachers: { some: { id: actor.id } } },
          })
        : 0;
      if (!teaches) throw new ForbiddenException('Not your course');
    } else {
      assertCenterScope(actor, record.course?.centerId);
    }
    return this.prisma.attendanceRecord.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async list(actor: AuthUser, query: ListAttendanceQuery) {
    const where: Prisma.AttendanceRecordWhereInput = {};
    if (actor.role === Role.STUDENT || actor.role === Role.TEACHER) {
      where.userId = actor.id; // own records only by default
      if (actor.role === Role.TEACHER && query.courseId) {
        where.course = { teachers: { some: { id: actor.id } } };
        delete where.userId; // teacher sees the whole course roster
        if (query.userId) where.userId = query.userId;
      }
    } else {
      if (query.userId) where.userId = query.userId;
      const centerId = centerFilter(actor);
      if (centerId) {
        // Course-linked records by course center OR course-less check-ins
        // by the user's center.
        where.OR = [
          { course: { centerId } },
          { user: { centerId } },
        ];
      }
    }
    if (query.courseId) where.courseId = query.courseId;
    if (query.from || query.to) {
      where.date = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }
    return this.prisma.attendanceRecord.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, username: true, role: true } },
        course: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }
}
