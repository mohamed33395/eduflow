import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import {
  CreatePaymentDto,
  ListPaymentsQuery,
  UpdatePaymentDto,
} from './dto/finance.dto';

const PAYMENT_INCLUDE = {
  student: {
    include: { user: { select: { id: true, name: true, username: true } } },
  },
  course: { select: { id: true, name: true } },
} satisfies Prisma.PaymentInclude;

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async scopeCheck(actor: AuthUser, studentId: string, courseId: string) {
    if (actor.role === Role.SUPER_ADMIN) return;
    const [student, course] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        select: { centerId: true },
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { centerId: true, ownerId: true },
      }),
    ]);
    if (!student) throw new NotFoundException('Student not found');
    if (!course) throw new NotFoundException('Course not found');
    if (actor.role === Role.COURSE_OWNER && course.ownerId === actor.id) return;
    assertCenterScope(actor, student.centerId ?? course.centerId);
  }

  async create(actor: AuthUser, dto: CreatePaymentDto) {
    await this.scopeCheck(actor, dto.studentId, dto.courseId);
    const paid = dto.paid ?? 0;
    if (paid > dto.amount) {
      throw new BadRequestException('Paid cannot exceed amount');
    }
    return this.prisma.payment.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        amount: dto.amount,
        paid,
        remaining: dto.amount - paid,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  async list(actor: AuthUser, query: ListPaymentsQuery) {
    const where: Prisma.PaymentWhereInput = {};

    const courseWhere: Prisma.CourseWhereInput = {};
    if (actor.role === Role.STUDENT) {
      where.studentId = actor.id; // students see only their own payments
    } else if (actor.role === Role.TEACHER) {
      // teacher reviews payments of his own students (his courses)
      courseWhere.teachers = { some: { id: actor.id } };
      if (query.studentId) where.studentId = query.studentId;
    } else {
      if (query.studentId) where.studentId = query.studentId;
      if (query.courseId) where.courseId = query.courseId;
      if (query.teacherId && query.teacherId !== 'me') {
        courseWhere.teachers = { some: { id: query.teacherId } };
      }
      const centerId = query.centerId ?? centerFilter(actor);
      if (centerId) courseWhere.centerId = centerId;
    }
    if (Object.keys(courseWhere).length) where.course = courseWhere;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        relationLoadStrategy: 'join',
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  async update(actor: AuthUser, id: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.scopeCheck(actor, payment.studentId, payment.courseId);
    const amount = dto.amount ?? payment.amount;
    const paid = dto.paid ?? payment.paid;
    if (paid > amount) {
      throw new BadRequestException('Paid cannot exceed amount');
    }
    return this.prisma.payment.update({
      where: { id },
      data: {
        amount,
        paid,
        remaining: amount - paid,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  /** Add an installment to `paid`. */
  async recordInstallment(actor: AuthUser, id: string, amount: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.scopeCheck(actor, payment.studentId, payment.courseId);
    const paid = payment.paid + amount;
    if (paid > payment.amount) {
      throw new BadRequestException('Installment exceeds remaining balance');
    }
    return this.prisma.payment.update({
      where: { id },
      data: { paid, remaining: payment.amount - paid },
      include: PAYMENT_INCLUDE,
    });
  }

  async remove(actor: AuthUser, id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    await this.scopeCheck(actor, payment.studentId, payment.courseId);
    await this.prisma.payment.delete({ where: { id } });
    return { success: true };
  }
}
