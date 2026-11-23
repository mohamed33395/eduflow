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
import { Role } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PayoutsService } from './payouts.service';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import {
  CreatePaymentDto,
  GeneratePayoutDto,
  ListPaymentsQuery,
  ListPayoutsQuery,
  RecordInstallmentDto,
  UpdatePaymentDto,
  UpdatePayoutDto,
} from './dto/finance.dto';

const MANAGERS = [Role.SUPER_ADMIN, Role.CENTER_OWNER, Role.COURSE_OWNER];

@Controller()
export class FinanceController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly payouts: PayoutsService,
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
    @Query('teacherId') teacherId: string,
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.payouts.preview(actor, teacherId, periodStart, periodEnd);
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
