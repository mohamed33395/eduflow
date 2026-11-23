import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope } from '../common/access';
import {
  CreateAssignmentDto,
  CreateLessonDto,
  CreateSubmissionDto,
  GradeSubmissionDto,
  UpdateAssignmentDto,
  UpdateLessonDto,
} from './dto/learning.dto';

const CONTENT_MANAGERS: Role[] = [
  Role.SUPER_ADMIN,
  Role.CENTER_OWNER,
  Role.COURSE_OWNER,
  Role.TEACHER,
];

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  /** Whether actor may read a course's content (lessons/assignments). */
  private async assertCourseRead(actor: AuthUser, courseId: string) {
    if (
      actor.role === Role.SUPER_ADMIN ||
      actor.role === Role.CENTER_OWNER ||
      actor.role === Role.COURSE_OWNER
    ) {
      return;
    }
    if (actor.role === Role.TEACHER) {
      const teaches = await this.prisma.course.count({
        where: { id: courseId, teachers: { some: { id: actor.id } } },
      });
      if (teaches) return;
      throw new ForbiddenException('Not your course');
    }
    // student must be enrolled
    const enrolled = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId: actor.id, courseId },
      },
    });
    if (!enrolled) throw new ForbiddenException('Not enrolled in this course');
  }

  /** Whether actor may create/edit content in a course. */
  private async assertCourseManage(actor: AuthUser, courseId: string) {
    if (actor.role === Role.SUPER_ADMIN) return;
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true, centerId: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (actor.role === Role.CENTER_OWNER) {
      assertCenterScope(actor, course.centerId);
      return;
    }
    if (actor.role === Role.COURSE_OWNER && course.ownerId === actor.id) return;
    if (actor.role === Role.TEACHER) {
      const teaches = await this.prisma.course.count({
        where: { id: courseId, teachers: { some: { id: actor.id } } },
      });
      if (teaches) return;
    }
    throw new ForbiddenException('Cannot manage this course');
  }

  private courseFilter(actor: AuthUser): Prisma.LessonWhereInput &
    Prisma.AssignmentWhereInput {
    switch (actor.role) {
      case Role.STUDENT:
        return { course: { enrollments: { some: { studentId: actor.id } } } };
      case Role.TEACHER:
        return { course: { teachers: { some: { id: actor.id } } } };
      case Role.COURSE_OWNER:
        return { course: { ownerId: actor.id } };
      case Role.CENTER_OWNER:
        return { course: { centerId: actor.centerId ?? '∅' } };
      default:
        return {};
    }
  }

  // ── Lessons ─────────────────────────────────────────────────────

  async listLessons(actor: AuthUser, courseId: string) {
    await this.assertCourseRead(actor, courseId);
    return this.prisma.lesson.findMany({
      where: { courseId },
      include: { files: true },
      orderBy: { order: 'asc' },
    });
  }

  async createLesson(actor: AuthUser, dto: CreateLessonDto) {
    await this.assertCourseManage(actor, dto.courseId);
    const { files, ...data } = dto;
    return this.prisma.lesson.create({
      data: { ...data, files: files?.length ? { create: files } : undefined },
      include: { files: true },
    });
  }

  async updateLesson(actor: AuthUser, id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertCourseManage(actor, lesson.courseId);
    const { files, ...data } = dto;
    return this.prisma.$transaction(async (tx) => {
      if (files) {
        await tx.lessonFile.deleteMany({ where: { lessonId: id } });
      }
      return tx.lesson.update({
        where: { id },
        data: { ...data, files: files?.length ? { create: files } : undefined },
        include: { files: true },
      });
    });
  }

  async deleteLesson(actor: AuthUser, id: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.assertCourseManage(actor, lesson.courseId);
    await this.prisma.lesson.delete({ where: { id } });
    return { success: true };
  }

  // ── Assignments ─────────────────────────────────────────────────

  async listAssignments(actor: AuthUser, courseId: string) {
    await this.assertCourseRead(actor, courseId);
    return this.prisma.assignment.findMany({
      where: { courseId, ...this.courseFilter(actor) },
      include: {
        _count: { select: { submissions: true } },
        ...(actor.role === Role.STUDENT && {
          submissions: {
            where: { studentId: actor.id },
            select: { id: true, status: true, grade: true },
          },
        }),
      },
      orderBy: { deadline: 'asc' },
    });
  }

  async getAssignment(actor: AuthUser, id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: { _count: { select: { submissions: true } } },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertCourseRead(actor, assignment.courseId);
    return assignment;
  }

  /** List submissions — students only see their own. */
  async listSubmissionsByStudent(actor: AuthUser, studentId?: string) {
    const target = studentId ?? (actor.role === Role.STUDENT ? actor.id : undefined);
    if (!target) throw new BadRequestException('studentId required');
    if (actor.role === Role.STUDENT && actor.id !== target) {
      throw new ForbiddenException('Not your submissions');
    }
    if (actor.role === Role.TEACHER) {
      // teacher may only view submissions on their own assignments
      return this.prisma.submission.findMany({
        where: {
          studentId: target,
          assignment: { teacherId: actor.id },
        },
        include: { assignment: { select: { id: true, title: true, courseId: true } } },
        orderBy: { submittedAt: 'desc' },
      });
    }
    return this.prisma.submission.findMany({
      where: { studentId: target },
      include: { assignment: { select: { id: true, title: true, courseId: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async createAssignment(actor: AuthUser, dto: CreateAssignmentDto) {
    await this.assertCourseManage(actor, dto.courseId);
    if (!CONTENT_MANAGERS.includes(actor.role)) {
      throw new ForbiddenException();
    }
    return this.prisma.assignment.create({
      data: {
        ...dto,
        deadline: new Date(dto.deadline),
        teacherId: actor.id,
      },
    });
  }

  async updateAssignment(actor: AuthUser, id: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.role === Role.TEACHER && assignment.teacherId !== actor.id) {
      throw new ForbiddenException('Not your assignment');
    }
    await this.assertCourseManage(actor, assignment.courseId);
    return this.prisma.assignment.update({
      where: { id },
      data: { ...dto, ...(dto.deadline && { deadline: new Date(dto.deadline) }) },
    });
  }

  async deleteAssignment(actor: AuthUser, id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.role === Role.TEACHER && assignment.teacherId !== actor.id) {
      throw new ForbiddenException('Not your assignment');
    }
    await this.assertCourseManage(actor, assignment.courseId);
    await this.prisma.assignment.delete({ where: { id } });
    return { success: true };
  }

  // ── Submissions ─────────────────────────────────────────────────

  async listSubmissions(actor: AuthUser, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.role === Role.STUDENT) {
      await this.assertCourseRead(actor, assignment.courseId);
      return this.prisma.submission.findMany({
        where: { assignmentId, studentId: actor.id },
      });
    }
    await this.assertCourseManage(actor, assignment.courseId);
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { include: { user: { select: { name: true, username: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /** Student submits their work. */
  async submit(actor: AuthUser, assignmentId: string, dto: CreateSubmissionDto) {
    if (!dto.fileUrl && !dto.text) {
      throw new BadRequestException('Provide fileUrl or text');
    }
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assertCourseRead(actor, assignment.courseId);
    return this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId: actor.id },
      },
      create: { assignmentId, studentId: actor.id, ...dto },
      update: { ...dto, status: 'PENDING', submittedAt: new Date() },
    });
  }

  /** Teacher grades a submission. */
  async grade(
    actor: AuthUser,
    submissionId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    await this.assertCourseManage(actor, submission.assignment.courseId);
    if (
      submission.assignment.maxGrade != null &&
      dto.grade > submission.assignment.maxGrade
    ) {
      throw new BadRequestException(
        `Grade exceeds max (${submission.assignment.maxGrade})`,
      );
    }
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { grade: dto.grade, feedback: dto.feedback, status: 'GRADED' },
    });
  }
}
