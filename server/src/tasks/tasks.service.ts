import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, TaskSubmissionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { centerFilter } from '../common/access';
import {
  CreateTaskDto,
  ReviewTaskSubmissionDto,
  SendResultDto,
  SubmitTaskDto,
} from './dto/tasks.dto';

const TASK_INCLUDE = {
  subject: { select: { id: true, name: true } },
  lesson: { select: { id: true, title: true } },
  teacher: {
    select: { id: true, user: { select: { name: true } } },
  },
  _count: { select: { recipients: true, submissions: true } },
} satisfies Prisma.TaskInclude;

const SUBMISSION_INCLUDE = {
  student: {
    select: {
      id: true,
      parentName: true,
      parentPhone: true,
      user: { select: { name: true, username: true } },
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      subjectId: true,
      teacherId: true,
      centerId: true,
      subject: { select: { name: true } },
    },
  },
} satisfies Prisma.TaskSubmissionInclude;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────

  private assertCanManage(actor: AuthUser, centerId: string | null) {
    if (actor.role === Role.SUPER_ADMIN) return;
    if (actor.role === Role.CENTER_OWNER && actor.centerId === centerId) return;
    throw new ForbiddenException('Outside your center scope');
  }

  /** All students who should receive a task for this subject + reviewer. */
  private async resolveRecipientIds(
    subjectId: string,
    teacherId: string,
  ): Promise<string[]> {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: { courseId: true, classId: true, centerId: true },
    });
    if (!subject) return [];

    const [byAssignment, byCourse, byClass, byPrimaryTeacher] =
      await Promise.all([
        this.prisma.studentSubjectAssignment.findMany({
          where: { subjectId },
          select: { studentId: true },
        }),
        subject.courseId
          ? this.prisma.enrollment.findMany({
              where: { courseId: subject.courseId },
              select: { studentId: true },
            })
          : Promise.resolve([] as { studentId: string }[]),
        subject.classId
          ? this.prisma.studentProfile.findMany({
              where: { classId: subject.classId },
              select: { id: true },
            })
          : Promise.resolve([] as { id: string }[]),
        this.prisma.studentProfile.findMany({
          where: { primaryTeacherId: teacherId },
          select: { id: true },
        }),
      ]);

    const ids = new Set<string>();
    for (const r of byAssignment) ids.add(r.studentId);
    for (const r of byCourse) ids.add(r.studentId);
    for (const r of byClass) ids.add(r.id);
    for (const r of byPrimaryTeacher) ids.add(r.id);
    return [...ids];
  }

  private async taskStats(taskId: string) {
    const [notified, submitted, graded, rejected] = await Promise.all([
      this.prisma.taskRecipient.count({ where: { taskId } }),
      this.prisma.taskSubmission.count({
        where: { taskId, status: TaskSubmissionStatus.SUBMITTED },
      }),
      this.prisma.taskSubmission.count({
        where: { taskId, status: TaskSubmissionStatus.GRADED },
      }),
      this.prisma.taskSubmission.count({
        where: { taskId, status: TaskSubmissionStatus.REJECTED },
      }),
    ]);
    // every row in submissions came from a student who responded
    const responded = submitted + graded + rejected;
    return {
      notified,
      submitted,
      graded,
      rejected,
      pending: Math.max(0, notified - responded),
    };
  }

  // ── center ───────────────────────────────────────────────────────

  /** Options for the create form: subject teachers, lessons, recipient count. */
  async formData(actor: AuthUser, subjectId: string) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: subjectId },
      select: {
        id: true,
        name: true,
        centerId: true,
        courseId: true,
        classId: true,
      },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.assertCanManage(actor, subject.centerId);

    const [teachers, lessons, studentCount] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where: {
          OR: [
            { subjectAssignments: { some: { subjectId } } },
            { subjects: { some: { id: subjectId } } },
            ...(subject.courseId
              ? [{ courses: { some: { id: subject.courseId } } }]
              : []),
          ],
        },
        select: { id: true, user: { select: { name: true } } },
      }),
      subject.courseId
        ? this.prisma.lesson.findMany({
            where: { courseId: subject.courseId },
            select: { id: true, title: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([] as { id: string; title: string }[]),
      // preview count — same union as resolveRecipientIds, minus
      // primaryTeacher (teacher isn't chosen yet at this step)
      this.prisma.studentProfile.count({
        where: {
          OR: [
            { subjectAssignments: { some: { subjectId } } },
            ...(subject.courseId
              ? [{ courses: { some: { courseId: subject.courseId } } }]
              : []),
            ...(subject.classId ? [{ classId: subject.classId }] : []),
          ],
        },
      }),
    ]);

    return {
      teachers: teachers.map((t) => ({ id: t.id, name: t.user.name })),
      lessons,
      studentCount,
    };
  }

  async create(actor: AuthUser, dto: CreateTaskDto) {
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
      select: { id: true, name: true, centerId: true },
    });
    if (!subject) throw new NotFoundException('Subject not found');
    this.assertCanManage(actor, subject.centerId);
    const centerId = subject.centerId;
    if (!centerId) {
      throw new BadRequestException('Subject is not attached to a center');
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: dto.teacherId },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    if (dto.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: dto.lessonId },
        select: { id: true },
      });
      if (!lesson) throw new NotFoundException('Lesson not found');
    }

    const recipientIds = await this.resolveRecipientIds(
      dto.subjectId,
      dto.teacherId,
    );

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          title: dto.title,
          centerId,
          subjectId: dto.subjectId,
          teacherId: dto.teacherId,
          lessonId: dto.lessonId,
          examFileUrl: dto.examFileUrl,
          createdById: actor.id,
          recipients: {
            create: recipientIds.map((studentId) => ({ studentId })),
          },
        },
        include: TASK_INCLUDE,
      });
      await tx.notification.createMany({
        data: [
          ...recipientIds.map((userId) => ({
            userId,
            type: 'TASK_ASSIGNED',
            title: `تاسك جديد: ${dto.title}`,
            body: `${subject.name} — حلّ التاسك وارفع الحل`,
            data: { taskId: created.id } as Prisma.InputJsonValue,
          })),
          {
            userId: teacher.id,
            type: 'TASK_ASSIGNED',
            title: `تم تعيينك مراجعًا: ${dto.title}`,
            body: `${subject.name} — ${recipientIds.length} طالب`,
            data: { taskId: created.id } as Prisma.InputJsonValue,
          },
        ],
      });
      return created;
    });

    return { ...task, stats: await this.taskStats(task.id) };
  }

  async list(actor: AuthUser, centerId?: string) {
    const effectiveCenterId = centerId ?? centerFilter(actor);
    if (actor.role !== Role.SUPER_ADMIN) {
      this.assertCanManage(actor, effectiveCenterId ?? null);
    }
    const tasks = await this.prisma.task.findMany({
      where: {
        ...(effectiveCenterId && { centerId: effectiveCenterId }),
        ...(actor.role === Role.TEACHER && { teacherId: actor.id }),
      },
      include: TASK_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return Promise.all(
      tasks.map(async (t) => ({ ...t, stats: await this.taskStats(t.id) })),
    );
  }

  /** Detail + per-student status rows for the center dashboard. */
  async get(actor: AuthUser, id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        ...TASK_INCLUDE,
        recipients: {
          include: {
            student: {
              select: {
                id: true,
                parentName: true,
                parentPhone: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        submissions: { include: SUBMISSION_INCLUDE },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    this.assertCanManage(actor, task.centerId);

    const submissionsByStudent = new Map(
      task.submissions.map((s) => [s.studentId, s]),
    );
    const students = task.recipients.map((r) => {
      const sub = submissionsByStudent.get(r.studentId);
      return {
        studentId: r.studentId,
        name: r.student.user.name,
        parentPhone: r.student.parentPhone,
        status: sub?.status ?? 'PENDING',
        submissionId: sub?.id ?? null,
        fileUrl: sub?.fileUrl ?? null,
        grade: sub?.grade ?? null,
        feedback: sub?.feedback ?? null,
        attempts: sub?.attempts ?? 0,
        submittedAt: sub?.submittedAt ?? null,
        resultSentAt: sub?.resultSentAt ?? null,
      };
    });
    return { ...task, students, stats: await this.taskStats(id) };
  }

  // ── student ──────────────────────────────────────────────────────

  async mine(actor: AuthUser) {
    const recipients = await this.prisma.taskRecipient.findMany({
      where: { studentId: actor.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        task: {
          include: {
            subject: { select: { id: true, name: true } },
            lesson: { select: { id: true, title: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });
    const submissions = await this.prisma.taskSubmission.findMany({
      where: {
        studentId: actor.id,
        taskId: { in: recipients.map((r) => r.taskId) },
      },
    });
    const byTask = new Map(submissions.map((s) => [s.taskId, s]));
    return recipients.map((r) => ({
      recipientId: r.id,
      task: r.task,
      mySubmission: byTask.get(r.taskId) ?? null,
      status: byTask.get(r.taskId)?.status ?? 'PENDING',
    }));
  }

  async submit(actor: AuthUser, taskId: string, dto: SubmitTaskDto) {
    if (actor.role !== Role.STUDENT) {
      throw new ForbiddenException('Students only');
    }
    const recipient = await this.prisma.taskRecipient.findUnique({
      where: { taskId_studentId: { taskId, studentId: actor.id } },
      include: { task: { select: { id: true, title: true, teacherId: true } } },
    });
    if (!recipient) {
      throw new ForbiddenException('This task was not assigned to you');
    }
    const existing = await this.prisma.taskSubmission.findUnique({
      where: { taskId_studentId: { taskId, studentId: actor.id } },
    });
    if (existing && existing.status === TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException('Already submitted — awaiting review');
    }
    if (existing && existing.status === TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Already graded');
    }

    const submission = existing
      ? await this.prisma.taskSubmission.update({
          where: { id: existing.id },
          data: {
            fileUrl: dto.fileUrl,
            status: TaskSubmissionStatus.SUBMITTED,
            submittedAt: new Date(),
            attempts: { increment: 1 },
            reviewedAt: null,
          },
          include: SUBMISSION_INCLUDE,
        })
      : await this.prisma.taskSubmission.create({
          data: { taskId, studentId: actor.id, fileUrl: dto.fileUrl },
          include: SUBMISSION_INCLUDE,
        });

    await this.notifications.notifyOne({
      userId: recipient.task.teacherId,
      type: 'TASK_SUBMITTED',
      title: `حل جديد: ${recipient.task.title}`,
      body: `${submission.student.user.name} رفع الحل`,
      data: { taskId, submissionId: submission.id },
    });
    return submission;
  }

  // ── teacher review ───────────────────────────────────────────────

  async reviewQueue(actor: AuthUser) {
    const where: Prisma.TaskSubmissionWhereInput =
      actor.role === Role.TEACHER
        ? { task: { teacherId: actor.id } }
        : { task: { centerId: centerFilter(actor) } };
    return this.prisma.taskSubmission.findMany({
      where,
      include: SUBMISSION_INCLUDE,
      orderBy: [{ status: 'asc' }, { submittedAt: 'desc' }],
      take: 100,
    });
  }

  private async loadSubmissionForReview(actor: AuthUser, id: string) {
    const sub = await this.prisma.taskSubmission.findUnique({
      where: { id },
      include: SUBMISSION_INCLUDE,
    });
    if (!sub) throw new NotFoundException('Submission not found');
    const reviewerOk =
      actor.role === Role.SUPER_ADMIN ||
      (actor.role === Role.CENTER_OWNER &&
        actor.centerId === sub.task.centerId) ||
      (actor.role === Role.TEACHER && sub.task.teacherId === actor.id);
    if (!reviewerOk) throw new ForbiddenException('Not your submission');
    return sub;
  }

  async review(actor: AuthUser, id: string, dto: ReviewTaskSubmissionDto) {
    const sub = await this.loadSubmissionForReview(actor, id);
    if (sub.status !== TaskSubmissionStatus.SUBMITTED) {
      throw new BadRequestException('Submission already reviewed');
    }
    if (dto.action === 'accept' && dto.grade === undefined) {
      throw new BadRequestException('Grade is required when accepting');
    }

    const graded = dto.action === 'accept';
    const updated = await this.prisma.taskSubmission.update({
      where: { id },
      data: {
        status: graded
          ? TaskSubmissionStatus.GRADED
          : TaskSubmissionStatus.REJECTED,
        grade: graded ? dto.grade : null,
        feedback: dto.feedback ?? null,
        reviewedAt: new Date(),
      },
      include: SUBMISSION_INCLUDE,
    });

    await this.notifications.notifyOne({
      userId: sub.studentId,
      type: graded ? 'TASK_GRADED' : 'TASK_REJECTED',
      title: graded
        ? `تم قبول حلك: ${sub.task.title}`
        : `تم رفض حلك: ${sub.task.title}`,
      body: graded
        ? `الدرجة: ${dto.grade}${dto.feedback ? ` — ${dto.feedback}` : ''}`
        : `${dto.feedback ? `${dto.feedback} — ` : ''}حلّ مرة أخرى وارفع الحل`,
      data: { taskId: sub.taskId, submissionId: id },
    });
    return updated;
  }

  // ── result → WhatsApp ────────────────────────────────────────────

  /** Normalize an Egyptian-ish phone to international digits for wa.me/API. */
  private waPhone(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = `2${digits}`; // 01x → 201x (Egypt)
    return digits.length >= 10 ? digits : null;
  }

  async sendResult(actor: AuthUser, id: string, dto: SendResultDto) {
    const sub = await this.loadSubmissionForReview(actor, id);
    if (sub.status !== TaskSubmissionStatus.GRADED) {
      throw new BadRequestException('Only graded submissions can be sent');
    }

    const phone = this.waPhone(sub.student.parentPhone);
    if (!phone) {
      throw new BadRequestException('Student has no parent phone number');
    }
    const studentName = sub.student.user.name;
    const text =
      `نتيجة ${sub.task.title} — ${sub.task.subject.name}\n` +
      `الطالب: ${studentName}\n` +
      `الدرجة: ${sub.grade ?? '-'}` +
      (sub.feedback ? `\nملاحظات: ${sub.feedback}` : '');

    // Manual-send confirmation after the teacher used the wa.me link.
    if (dto.markOnly) {
      const done = await this.prisma.taskSubmission.update({
        where: { id },
        data: { resultSentAt: new Date() },
      });
      return { sent: true, manual: true, resultSentAt: done.resultSentAt };
    }

    const token = this.config.get<string>('WHATSAPP_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    // Real send via Meta WhatsApp Cloud API when configured.
    if (token && phoneNumberId) {
      const res = await fetch(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: text },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        throw new BadRequestException(`WhatsApp API failed: ${err}`);
      }
      const done = await this.prisma.taskSubmission.update({
        where: { id },
        data: { resultSentAt: new Date() },
      });
      return { sent: true, manual: false, resultSentAt: done.resultSentAt };
    }

    // Fallback: deep link opens WhatsApp with the message pre-filled.
    return {
      sent: false,
      manual: true,
      waUrl: `https://wa.me/${phone}?text=${encodeURIComponent(text)}`,
      parentPhone: phone,
    };
  }
}
