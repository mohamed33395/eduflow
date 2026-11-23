import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompensationType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import { UsersService } from '../users/users.service';
import { StudentsService } from './students.service';
import {
  AssignSubjectsDto,
  CreateTeacherDto,
  UpdateTeacherDto,
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
  center: { select: { id: true, name: true } },
  courses: { select: { id: true, name: true } },
  classes: { select: { id: true, name: true } },
  subjects: { select: { id: true, name: true } },
  subjectAssignments: {
    include: { subject: { select: { id: true, name: true } } },
  },
} satisfies Prisma.TeacherProfileInclude;

@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly students: StudentsService,
  ) {}

  private validateCompensation(
    type: CompensationType | undefined,
    fixed: number | null | undefined,
    percent: number | null | undefined,
  ) {
    if (type === CompensationType.FIXED && (fixed == null || fixed < 0)) {
      throw new BadRequestException('fixedAmount is required for FIXED compensation');
    }
    if (
      type === CompensationType.PERCENTAGE &&
      (percent == null || percent < 1 || percent > 100)
    ) {
      throw new BadRequestException(
        'commissionPercent (1-100) is required for PERCENTAGE compensation',
      );
    }
  }

  async create(actor: AuthUser, dto: CreateTeacherDto) {
    this.validateCompensation(
      dto.compensationType,
      dto.fixedAmount,
      dto.commissionPercent,
    );
    const {
      courseIds,
      classIds,
      subjectAssignments,
      compensationType,
      fixedAmount,
      commissionPercent,
      ...userDto
    } = dto;
    const user = await this.users.create(actor, {
      ...userDto,
      role: Role.TEACHER,
    });
    return this.prisma.teacherProfile.update({
      where: { id: user.id },
      data: {
        compensationType,
        fixedAmount:
          compensationType === CompensationType.FIXED ? fixedAmount : null,
        commissionPercent:
          compensationType === CompensationType.PERCENTAGE
            ? commissionPercent
            : null,
        ...(courseIds?.length && { courses: { connect: courseIds.map((id) => ({ id })) } }),
        ...(classIds?.length && { classes: { connect: classIds.map((id) => ({ id })) } }),
        ...(subjectAssignments?.length && {
          subjectAssignments: { create: subjectAssignments },
        }),
      },
      include: PROFILE_INCLUDE,
    });
  }

  async list(actor: AuthUser, centerId?: string) {
    return this.prisma.teacherProfile.findMany({
      where: { centerId: centerId ?? centerFilter(actor) },
      relationLoadStrategy: 'join',
      include: PROFILE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertCanSee(actor: AuthUser, teacher: { centerId: string | null }) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.TEACHER) {
      return; // teachers can see colleagues in the same center via center scope below
    }
    assertCenterScope(actor, teacher.centerId);
  }

  async get(actor: AuthUser, id: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id },
      relationLoadStrategy: 'join',
      include: {
        ...PROFILE_INCLUDE,
        payouts: { orderBy: { periodStart: 'desc' }, take: 12 },
      },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    if (actor.role === Role.TEACHER && actor.id !== id) {
      assertCenterScope(actor, profile.centerId);
    } else {
      await this.assertCanSee(actor, profile);
    }
    return profile;
  }

  async update(actor: AuthUser, id: string, dto: UpdateTeacherDto) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    if (actor.role === Role.TEACHER) {
      throw new ForbiddenException('Only admins can update teacher accounts');
    }
    assertCenterScope(actor, profile.centerId);

    const type = dto.compensationType ?? profile.compensationType;
    const fixed =
      dto.fixedAmount !== undefined ? dto.fixedAmount : profile.fixedAmount;
    const percent =
      dto.commissionPercent !== undefined
        ? dto.commissionPercent
        : profile.commissionPercent;
    this.validateCompensation(type, fixed, percent);

    return this.prisma.teacherProfile.update({
      where: { id },
      data: {
        compensationType: type,
        fixedAmount: type === CompensationType.FIXED ? fixed : null,
        commissionPercent:
          type === CompensationType.PERCENTAGE ? percent : null,
        ...(dto.courseIds && {
          courses: { set: dto.courseIds.map((cid) => ({ id: cid })) },
        }),
        ...(dto.classIds && {
          classes: { set: dto.classIds.map((cid) => ({ id: cid })) },
        }),
      },
      include: PROFILE_INCLUDE,
    });
  }

  /** Soft remove — deactivates the underlying user account. */
  async remove(actor: AuthUser, id: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id },
      select: { centerId: true },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    assertCenterScope(actor, profile.centerId);
    await this.users.deactivate(actor, id);
    return { success: true };
  }

  async setSubjectAssignments(
    actor: AuthUser,
    id: string,
    dto: AssignSubjectsDto,
  ) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    assertCenterScope(actor, profile.centerId);
    await this.prisma.$transaction([
      this.prisma.teacherSubjectAssignment.deleteMany({
        where: { teacherId: id },
      }),
      this.prisma.teacherSubjectAssignment.createMany({
        data: dto.assignments.map((a) => ({ ...a, teacherId: id })),
      }),
    ]);
    return this.get(actor, id);
  }

  /** Students belonging to this teacher (for the teacher's dashboard). */
  async listStudents(actor: AuthUser, id: string) {
    if (actor.role === Role.TEACHER && actor.id !== id) {
      throw new ForbiddenException('Not your account');
    }
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Teacher not found');
    if (actor.role !== Role.TEACHER) {
      assertCenterScope(actor, profile.centerId);
    }
    const ids = await this.students.studentIdsForTeacher(id);
    return this.prisma.studentProfile.findMany({
      where: { id: { in: ids } },
      relationLoadStrategy: 'join',
      include: {
        user: { select: { id: true, name: true, username: true, phone: true } },
        class: { select: { id: true, name: true } },
        courses: { include: { course: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
