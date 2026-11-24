import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { PaymentChannelsService } from './payment-channels.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreatePaymentDto,
  CreatePaymentMethodDto,
  CreatePaymentProofDto,
  GeneratePayoutDto,
  ListPaymentsQuery,
  ListPayoutsQuery,
  ListProofsQuery,
  PreviewPayoutQuery,
  RecordInstallmentDto,
  ReviewPaymentProofDto,
  UpdatePaymentDto,
  UpdatePaymentMethodDto,
  UpdatePayoutDto,
} from './dto/finance.dto';

const MANAGERS = [Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER];

@Controller()
export class FinanceController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payouts: PayoutsService,
    private readonly channels: PaymentChannelsService,
  ) {}

  // ── Payments ──
  @Post('payments')
  @Roles(...MANAGERS)
  createPayment(@CurrentUser() actor: AuthUser, @Body() dto: CreatePaymentDto) {
    return this.payments.create(actor, dto);
  }

  @Get('payments')
  listPayments(@CurrentUser() actor: AuthUser, @Query() query: ListPaymentsQuery) {
    return this.payments.list(actor, query);
  }

  @Patch('payments/:id')
  @Roles(...MANAGERS)
  updatePayment(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.payments.update(actor, id, dto);
  }

  @Post('payments/:id/installments')
  @Roles(...MANAGERS)
  recordInstallment(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: RecordInstallmentDto,
  ) {
    return this.payments.recordInstallment(actor, id, dto.amount);
  }

  @Delete('payments/:id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  removePayment(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.payments.remove(actor, id);
  }

  // ── Payment methods (collection accounts) ──
  @Get('payment-methods')
  listMethods(@CurrentUser() actor: AuthUser) {
    return this.channels.listMethods(actor);
  }

  @Post('payment-methods')
  @Roles(...MANAGERS)
  createMethod(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreatePaymentMethodDto,
  ) {
    return this.channels.createMethod(actor, dto);
  }

  @Patch('payment-methods/:id')
  @Roles(...MANAGERS)
  updateMethod(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ) {
    return this.channels.updateMethod(actor, id, dto);
  }

  @Delete('payment-methods/:id')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  removeMethod(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.channels.removeMethod(actor, id);
  }

  // ── Student transfer proofs ──
  @Post('payments/:id/proofs')
  @Roles(Role.STUDENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  submitProof(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreatePaymentProofDto,
  ) {
    return this.channels.submitProof(actor, id, dto);
  }

  /** Center admins review all proofs in their center. */
  @Get('payment-proofs')
  @Roles(...MANAGERS)
  listProofs(@CurrentUser() actor: AuthUser, @Query() query: ListProofsQuery) {
    return this.channels.listProofs(actor, query);
  }

  /** Student's own submitted proofs. */
  @Get('payment-proofs/mine')
  @Roles(Role.STUDENT)
  myProofs(@CurrentUser() actor: AuthUser) {
    return this.channels.myProofs(actor);
  }

  @Patch('payment-proofs/:id')
  @Roles(...MANAGERS)
  reviewProof(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewPaymentProofDto,
  ) {
    return this.channels.reviewProof(actor, id, dto);
  }

  // ── Teacher payouts ──
  @Post('payouts')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  generatePayout(@CurrentUser() actor: AuthUser, @Body() dto: GeneratePayoutDto) {
    return this.payouts.generate(actor, dto);
  }

  @Get('payouts/preview')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.TEACHER)
  previewPayout(
    @CurrentUser() actor: AuthUser,
    @Query() query: PreviewPayoutQuery,
  ) {
    return this.payouts.preview(
      actor,
      query.teacherId,
      query.periodStart,
      query.periodEnd,
    );
  }

  @Get('payouts')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.TEACHER)
  listPayouts(@CurrentUser() actor: AuthUser, @Query() query: ListPayoutsQuery) {
    return this.payouts.list(actor, query);
  }

  @Get('payouts/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.TEACHER)
  getPayout(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.payouts.get(actor, id);
  }

  @Patch('payouts/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  updatePayout(
    @CurrentUser() actor: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePayoutDto,
  ) {
    return this.payouts.update(actor, id, dto);
  }

  @Delete('payouts/:id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_OWNER)
  @HttpCode(HttpStatus.OK)
  removePayout(@CurrentUser() actor: AuthUser, @Param('id') id: string) {
    return this.payouts.remove(actor, id);
  }
}
