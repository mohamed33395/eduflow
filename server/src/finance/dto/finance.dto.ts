import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaymentMethodKind,
  PaymentProofStatus,
  PayoutStatus,
} from '@prisma/client';

// ── Payments ──

export class CreatePaymentDto {
  @IsString()
  studentId!: string;

  @IsString()
  courseId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paid?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RecordInstallmentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class ListPaymentsQuery {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  /** teacherId or 'me' — payments of a teacher's courses. */
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ── Payment methods (collection accounts) ──

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodKind)
  kind!: PaymentMethodKind;

  @IsString()
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(200)
  account!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  account?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;

  @IsOptional()
  isActive?: boolean;
}

// ── Student transfer proofs ──

export class CreatePaymentProofDto {
  @IsOptional()
  @IsString()
  methodId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  screenshot?: string;
}

export class ListProofsQuery {
  @IsOptional()
  @IsEnum(PaymentProofStatus)
  status?: PaymentProofStatus;
}

export class ReviewPaymentProofDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// ── Teacher payouts ──

export class PreviewPayoutQuery {
  @IsString()
  teacherId!: string;

  /** First day of the period, e.g. 2026-10-01 */
  @IsDateString()
  periodStart!: string;

  /** Last day of the period (inclusive), e.g. 2026-10-31 */
  @IsDateString()
  periodEnd!: string;
}

export class GeneratePayoutDto {
  @IsString()
  teacherId!: string;

  /** First day of the period, e.g. 2026-10-01 */
  @IsDateString()
  periodStart!: string;

  /** Last day of the period (inclusive), e.g. 2026-10-31 */
  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdatePayoutDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class ListPayoutsQuery {
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
