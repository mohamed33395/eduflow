import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import { slugify } from '../common/slug';
import {
  CreateClassDto,
  CreateCourseDto,
  CreateSubjectDto,
  UpdateClassDto,
  UpdateCourseDto,
  UpdateSubjectDto,
} from './dto/academics.dto';

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueCourseSlug(base: string) {
    let slug = slugify(base);
    let i = 1;
    while (await this.prisma.course.findUnique({ where: { slug } })) {
      slug = `${slugify(base)}-${++i}`;
    }
    return slug;
  }

  /** Center the entity belongs to (for scope checks). */
  private scopeCenterId(
    actor: AuthUser,
    entityCenterId: string | null | undefined,
  ) {
    if (actor.role === Role.SUPER_ADMIN) return;
    assertCenterScope(actor, entityCenterId ?? actor.centerId);
  }

  // ── Courses ─────────────────────────────────────────────────────

  async createCourse(actor: AuthUser, dto: CreateCourseDto) {
    const centerId =
      actor.role === Role.CENTER_OWNER ? actor.centerId : dto.centerId;
    const { ownerId: requestedOwner, ...data } = dto;
    const ownerId =
      actor.role === Role.SUPER_ADMIN && requestedOwner
        ? requestedOwner
        : actor.id;
    return this.prisma.course.create({
      data: {
        ...data,
        centerId,
        ownerId,
        slug: await this.uniqueCourseSlug(dto.slug ?? dto.name),
      },
      include: {
        owner: { select: { id: true, name: true } },
        center: { select: { id: true, name: true } },
      },
    });
  }

  async listCourses(actor: AuthUser, centerId?: string) {
    const where: Prisma.CourseWhereInput = {
      centerId: centerId ?? centerFilter(actor),
    };
    if (actor.role === Role.COURSE_OWNER) where.ownerId = actor.id;
    if (actor.role === Role.TEACHER) {
      where.teachers = { some: { id: actor.id } };
    }
    if (actor.role === Role.STUDENT) {
      where.enrollments = { some: { studentId: actor.id } };
    }
    return this.prisma.course.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, slug: true } },
        _count: {
          select: { enrollments: true, lessons: true, assignments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCourse(actor: AuthUser, id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        center: { select: { id: true, name: true, slug: true } },
        teachers: { include: { user: { select: { name: true } } } },
        subjects: true,
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    this.scopeCenterId(actor, course.centerId);
    if (actor.role === Role.COURSE_OWNER && course.ownerId !== actor.id) {
      throw new ConflictException('Not your course');
    }
    if (actor.role === Role.STUDENT) {
      const enrolled = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: actor.id, courseId: id } },
      });
      if (!enrolled) throw new ConflictException('Not enrolled');
    }
    return course;
  }

  async getCourseBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        level: true,
        description: true,
        coverImage: true,
        center: { select: { name: true, slug: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async updateCourse(actor: AuthUser, id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (
      actor.role !== Role.SUPER_ADMIN &&
      course.ownerId !== actor.id &&
      course.centerId !== actor.centerId
    ) {
      throw new ConflictException('Cannot edit this course');
    }
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(actor: AuthUser, id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    if (actor.role !== Role.SUPER_ADMIN && course.ownerId !== actor.id) {
      assertCenterScope(actor, course.centerId);
    }
    await this.prisma.course.delete({ where: { id } });
    return { success: true };
  }

  // ── Classes ─────────────────────────────────────────────────────

  async createClass(actor: AuthUser, dto: CreateClassDto) {
    const centerId =
      actor.role === Role.CENTER_OWNER ? actor.centerId : dto.centerId;
    return this.prisma.class.create({ data: { ...dto, centerId } });
  }

  async listClasses(actor: AuthUser, centerId?: string) {
    const where: Prisma.ClassWhereInput = {
      centerId: centerId ?? centerFilter(actor),
    };
    if (actor.role === Role.TEACHER) {
      where.teachers = { some: { id: actor.id } };
    }
    return this.prisma.class.findMany({
      where,
      include: {
        _count: { select: { students: true, subjects: true } },
        teachers: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getClass(actor: AuthUser, id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true, subjects: true } },
        teachers: { include: { user: { select: { name: true } } } },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    this.scopeCenterId(actor, cls.centerId);
    return cls;
  }

  async updateClass(actor: AuthUser, id: string, dto: UpdateClassDto) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    this.scopeCenterId(actor, cls.centerId);
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  async deleteClass(actor: AuthUser, id: string) {
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    this.scopeCenterId(actor, cls.centerId);
    await this.prisma.class.delete({ where: { id } });
    return { success: true };
  }

  // ── Subjects ────────────────────────────────────────────────────

  async createSubject(actor: AuthUser, dto: CreateSubjectDto) {
    const centerId =
      actor.role === Role.CENTER_OWNER ? actor.centerId : dto.centerId;
    return this.prisma.subject.create({ data: { ...dto, centerId } });
  }

  async listSubjects(actor: AuthUser, centerId?: string, classId?: string) {
    const where: Prisma.SubjectWhereInput = {
      centerId: centerId ?? centerFilter(actor),
      ...(classId && { classId }),
    };
    if (actor.role === Role.TEACHER) {
      where.OR = [
        { teacherId: actor.id },
        { teacherAssignments: { some: { teacherId: actor.id } } },
      ];
    }
    if (actor.role === Role.STUDENT) {
      where.studentAssignments = { some: { studentId: actor.id } };
    }
    return this.prisma.subject.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubject(actor: AuthUser, id: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        teacher: { include: { user: { select: { name: true } } } },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.scopeCenterId(actor, subject.centerId);
    return subject;
  }

  async updateSubject(actor: AuthUser, id: string, dto: UpdateSubjectDto) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    this.scopeCenterId(actor, subject.centerId);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deleteSubject(actor: AuthUser, id: string) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Subject not found');
    this.scopeCenterId(actor, subject.centerId);
    await this.prisma.subject.delete({ where: { id } });
    return { success: true };
  }
}
