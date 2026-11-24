import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { assertCenterScope, centerFilter } from '../common/access';
import {
  CreatePaymentMethodDto,
  CreatePaymentProofDto,
  ListProofsQuery,
  ReviewPaymentProofDto,
  UpdatePaymentMethodDto,
} from './dto/finance.dto';

const PROOF_INCLUDE = {
  method: { select: { id: true, kind: true, label: true, account: true } },
  payment: {
    select: {
      id: true,
      amount: true,
      paid: true,
      remaining: true,
      course: { select: { id: true, name: true } },
      student: {
        select: {
          id: true,
          centerId: true,
          user: { select: { name: true, username: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentProofInclude;

@Injectable()
export class PaymentChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /** Center the actor manages (or belongs to, for students). */
  private async centerOf(actor: AuthUser): Promise<string | null> {
    if (actor.centerId) return actor.centerId;
    if (actor.role === Role.STUDENT) {
      const p = await this.prisma.studentProfile.findUnique({
        where: { id: actor.id },
        select: { centerId: true },
      });
      return p?.centerId ?? null;
    }
    return null;
  }

  private assertManager(actor: AuthUser) {
    if (actor.role === Role.SUPER_ADMIN || actor.role === Role.CENTER_OWNER)
      return;
    throw new ForbiddenException('Only center admins manage payments');
  }

  // ── Payment methods (collection accounts) ─────────────────────────

  async listMethods(actor: AuthUser) {
    const centerId =
      actor.role === Role.SUPER_ADMIN
        ? undefined
        : ((await this.centerOf(actor)) ?? '∅');
    return this.prisma.paymentMethod.findMany({
      where: {
        centerId,
        // students only see active accounts they can transfer to
        ...(actor.role === Role.STUDENT ? { isActive: true } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createMethod(actor: AuthUser, dto: CreatePaymentMethodDto) {
    this.assertManager(actor);
    const centerId = await this.centerOf(actor);
    if (!centerId) throw new BadRequestException('No center on your account');
    return this.prisma.paymentMethod.create({
      data: {
        centerId,
        kind: dto.kind,
        label: dto.label,
        account: dto.account,
        details: dto.details,
      },
    });
  }

  async updateMethod(actor: AuthUser, id: string, dto: UpdatePaymentMethodDto) {
    this.assertManager(actor);
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id },
      select: { centerId: true },
    });
    if (!method) throw new NotFoundException('Payment method not found');
    assertCenterScope(actor, method.centerId);
    return this.prisma.paymentMethod.update({
      where: { id },
      data: {
        label: dto.label,
        account: dto.account,
        details: dto.details,
        isActive: dto.isActive,
      },
    });
  }

  async removeMethod(actor: AuthUser, id: string) {
    this.assertManager(actor);
    const method = await this.prisma.paymentMethod.findUnique({
      where: { id },
      select: { centerId: true },
    });
    if (!method) throw new NotFoundException('Payment method not found');
    assertCenterScope(actor, method.centerId);
    await this.prisma.paymentMethod.delete({ where: { id } });
    return { success: true };
  }

  // ── Student transfer proofs ───────────────────────────────────────

  async submitProof(actor: AuthUser, paymentId: string, dto: CreatePaymentProofDto) {
    if (actor.role !== Role.STUDENT)
      throw new ForbiddenException('Only students submit proofs');
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { studentId: true, amount: true, paid: true, remaining: true },
    });
    if (!payment || payment.studentId !== actor.id)
      throw new NotFoundException('Payment not found');
    if (payment.remaining <= 0)
      throw new BadRequestException('This invoice is already fully paid');
    if (dto.methodId) {
      const method = await this.prisma.paymentMethod.findUnique({
        where: { id: dto.methodId },
        select: { centerId: true, isActive: true },
      });
      if (!method || !method.isActive)
        throw new BadRequestException('Payment method unavailable');
      const centerId = await this.centerOf(actor);
      if (centerId && method.centerId !== centerId)
        throw new ForbiddenException('Outside your center scope');
    }
    const amount = dto.amount ?? payment.remaining;
    if (!Number.isFinite(amount) || amount <= 0 || amount > payment.remaining)
      throw new BadRequestException(
        'Amount must be between 0 and the remaining balance',
      );

    // A proof must carry some evidence — ref number and/or screenshot.
    const reference = dto.reference?.trim() || undefined;
    const screenshot = dto.screenshot?.trim() || undefined;
    if (!reference && !screenshot)
      throw new BadRequestException(
        'Provide the transfer reference number or a screenshot',
      );
    // Foreign URLs are rejected — the screenshot must come from our storage.
    if (screenshot && !this.uploads.isOwnedUrl(screenshot))
      throw new BadRequestException(
        'Screenshot must be uploaded through the app',
      );

    // No spamming: one pending proof per invoice until it is reviewed.
    const pending = await this.prisma.paymentProof.findFirst({
      where: { paymentId, status: 'PENDING' },
      select: { id: true },
    });
    if (pending)
      throw new BadRequestException(
        'A proof is already under review for this invoice',
      );

    return this.prisma.paymentProof.create({
      data: {
        paymentId,
        methodId: dto.methodId,
        amount,
        reference,
        screenshot,
      },
      include: PROOF_INCLUDE,
    });
  }

  async myProofs(actor: AuthUser) {
    return this.prisma.paymentProof.findMany({
      where: { payment: { studentId: actor.id } },
      include: PROOF_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listProofs(actor: AuthUser, query: ListProofsQuery) {
    this.assertManager(actor);
    const centerId = centerFilter(actor);
    return this.prisma.paymentProof.findMany({
      where: {
        status: query.status,
        ...(centerId
          ? { payment: { student: { centerId } } }
          : {}),
      },
      include: PROOF_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  /**
   * Approve → record the claimed amount as paid on the invoice in the same
   * transaction (marks the student as having paid this month automatically).
   * Reject → just flag the proof so the student can resubmit.
   */
  async reviewProof(actor: AuthUser, id: string, dto: ReviewPaymentProofDto) {
    this.assertManager(actor);
    const proof = await this.prisma.paymentProof.findUnique({
      where: { id },
      include: {
        payment: {
          select: {
            studentId: true,
            amount: true,
            paid: true,
            remaining: true,
            student: { select: { centerId: true } },
          },
        },
      },
    });
    if (!proof) throw new NotFoundException('Proof not found');
    assertCenterScope(actor, proof.payment.student?.centerId);
    if (proof.status !== 'PENDING')
      throw new BadRequestException('Proof already reviewed');

    if (dto.action === 'reject') {
      return this.prisma.paymentProof.update({
        where: { id },
        data: {
          status: 'REJECTED',
          notes: dto.notes,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        include: PROOF_INCLUDE,
      });
    }

    // approve — settle the invoice atomically
    const paid = Math.min(proof.payment.amount, proof.payment.paid + proof.amount);
    const [updated] = await this.prisma.$transaction([
      this.prisma.paymentProof.update({
        where: { id },
        data: {
          status: 'APPROVED',
          notes: dto.notes,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        include: PROOF_INCLUDE,
      }),
      this.prisma.payment.update({
        where: { id: proof.paymentId },
        data: { paid, remaining: proof.payment.amount - paid },
      }),
    ]);
    return updated;
  }
}
