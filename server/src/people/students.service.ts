import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import { UsersService } from '../users/users.service';
import {
  AssignSubjectsDto,
  CreateStudentDto,
  UpdateStudentDto,
} from './dto/people.dto';

const PROFILE_INCLUDE = {
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      avatarUrl: true,
      isActive: true,
    },
  },
  class: { select: { id: true, name: true } },
  center: { select: { id: true, name: true } },
  primaryTeacher: {
    include: { user: { select: { name: true } } },
  },
  courses: { include: { course: { select: { id: true, name: true } } } },
  subjectAssignments: {
    include: { subject: { select: { id: true, name: true } } },
  },
} satisfies Prisma.StudentProfileInclude;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(actor: AuthUser, dto: CreateStudentDto) {
    const { courseIds, level, grade, classId, parentName, parentPhone, gender, primaryTeacherId, ...userDto } = dto;
    const user = await this.users.create(actor, {
      ...userDto,
      role: Role.STUDENT,
    });
    const profile = await this.prisma.studentProfile.update({
      where: { id: user.id },
      data: {
        level,
        grade,
        classId,
        parentName,
        parentPhone,
        gender,
        primaryTeacherId,
        ...(courseIds?.length && {
          courses: { create: courseIds.map((courseId) => ({ courseId })) },
        }),
      },
      include: PROFILE_INCLUDE,
    });
    return profile;
  }

  /** IDs of students a teacher can see (classes + courses + primary + subjects). */
  async studentIdsForTeacher(teacherId: string): Promise<string[]> {
    const [byClass, byCourse, byPrimary, bySubject] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { class: { teachers: { some: { id: teacherId } } } },
        select: { id: true },
      }),
      this.prisma.enrollment.findMany({
        where: { course: { teachers: { some: { id: teacherId } } } },
        select: { studentId: true },
      }),
      this.prisma.studentProfile.findMany({
        where: { primaryTeacherId: teacherId },
        select: { id: true },
      }),
      this.prisma.studentSubjectAssignment.findMany({
        where: {
          subject: {
            OR: [
              { teacherId },
              { teacherAssignments: { some: { teacherId } } },
            ],
          },
        },
        select: { studentId: true },
      }),
    ]);
    return [
      ...new Set([
        ...byClass.map((s) => s.id),
        ...byCourse.map((s) => s.studentId),
        ...byPrimary.map((s) => s.id),
        ...bySubject.map((s) => s.studentId),
      ]),
    ];
  }

  private async assertCanSee(actor: AuthUser, studentId: string) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.STUDENT) {
      if (actor.id !== studentId) throw new ForbiddenException('Not your profile');
      return;
    }
    if (actor.role === Role.TEACHER) {
      const ids = await this.studentIdsForTeacher(actor.id);
      if (!ids.includes(studentId)) {
        throw new ForbiddenException('Student not in your scope');
      }
      return;
    }
    // center/course owner: same center
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { centerId: true },
    });
    assertCenterScope(actor, profile?.centerId);
  }

  async list(
    actor: AuthUser,
    filters: {
      centerId?: string;
      classId?: string;
      teacherId?: string;
      subjectId?: string;
      courseId?: string;
    },
  ) {
    const where: Prisma.StudentProfileWhereInput = {
      centerId: filters.centerId ?? centerFilter(actor),
      ...(filters.classId && { classId: filters.classId }),
      ...(filters.subjectId && {
        subjectAssignments: { some: { subjectId: filters.subjectId } },
      }),
      ...(filters.courseId && {
        courses: { some: { courseId: filters.courseId } },
      }),
    };
    if (actor.role === Role.TEACHER) {
      where.id = { in: await this.studentIdsForTeacher(actor.id) };
    } else if (filters.teacherId) {
      where.OR = [
        { primaryTeacherId: filters.teacherId },
        { class: { teachers: { some: { id: filters.teacherId } } } },
      ];
    }
    return this.prisma.studentProfile.findMany({
      where,
      relationLoadStrategy: 'join',
      include: PROFILE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(actor: AuthUser, id: string) {
    await this.assertCanSee(actor, id);
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
      relationLoadStrategy: 'join',
      include: {
        ...PROFILE_INCLUDE,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!profile) throw new NotFoundException('Student not found');
    return profile;
  }

  async update(actor: AuthUser, id: string, dto: UpdateStudentDto) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Student not found');
    if (actor.role === Role.STUDENT) {
      // students may only update limited contact fields on themselves
      if (actor.id !== id) throw new ForbiddenException('Not your profile');
      const { parentPhone } = dto;
      return this.prisma.studentProfile.update({
        where: { id },
        data: { parentPhone },
        include: PROFILE_INCLUDE,
      });
    }
    assertCenterScope(actor, profile.centerId);
    return this.prisma.studentProfile.update({
      where: { id },
      data: dto,
      include: PROFILE_INCLUDE,
    });
  }

  async enroll(actor: AuthUser, id: string, courseId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Student not found');
    assertCenterScope(actor, profile.centerId);
    const exists = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: id, courseId } },
    });
    if (exists) throw new ConflictException('Already enrolled');
    return this.prisma.enrollment.create({
      data: { studentId: id, courseId },
      include: { course: { select: { id: true, name: true } } },
    });
  }

  async unenroll(actor: AuthUser, id: string, courseId: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Student not found');
    assertCenterScope(actor, profile.centerId);
    await this.prisma.enrollment.delete({
      where: { studentId_courseId: { studentId: id, courseId } },
    });
    return { success: true };
  }

  /** Soft remove — deactivates the underlying user account. */
  async remove(actor: AuthUser, id: string) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
      select: { centerId: true },
    });
    if (!profile) throw new NotFoundException('Student not found');
    assertCenterScope(actor, profile.centerId);
    await this.users.deactivate(actor, id);
    return { success: true };
  }

  async setSubjectAssignments(
    actor: AuthUser,
    id: string,
    dto: AssignSubjectsDto,
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Student not found');
    assertCenterScope(actor, profile.centerId);
    await this.prisma.$transaction([
      this.prisma.studentSubjectAssignment.deleteMany({
        where: { studentId: id },
      }),
      this.prisma.studentSubjectAssignment.createMany({
        data: dto.assignments.map((a) => ({ ...a, studentId: id })),
      }),
    ]);
    return this.get(actor, id);
  }
}
