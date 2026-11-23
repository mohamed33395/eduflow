import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingStatus, EducationLevel, Status } from '@prisma/client';

export class CenterSubjectDto {
  @IsEnum(EducationLevel)
  level!: EducationLevel;

  @IsInt()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  track?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class CenterGradeGroupDto {
  @IsEnum(EducationLevel)
  level!: EducationLevel;

  @IsInt()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsInt()
  @Min(1)
  count!: number;
}

export class CreateCenterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsString()
  ownerId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudentsPerClass?: number;
}

export class UpdateCenterDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  /** Custom slug — super admin only. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  /** Monthly platform fee the platform charges this center (super admin). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyFee?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudentsPerClass?: number;
}

// ── Platform billing ──

export class CreateBillingDto {
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateBillingDto {
  @IsEnum(BillingStatus)
  status!: BillingStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class UpdateCenterSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxStudentsPerClass?: number;

  /** Replaces the full subject price-list. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterSubjectDto)
  subjects?: CenterSubjectDto[];

  /** Replaces the full groups-per-year list. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterGradeGroupDto)
  groupsPerYear?: CenterGradeGroupDto[];
}

export class CreateYearPackageDto {
  @IsEnum(EducationLevel)
  level!: EducationLevel;

  @IsInt()
  @Min(1)
  @Max(12)
  grade!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  track?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bundlePrice?: number;

  @IsInt()
  @Min(1)
  @Max(500)
  maxStudentsPerClass!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterSubjectDto)
  subjects!: CenterSubjectDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CenterGradeGroupDto)
  groupsPerYear!: CenterGradeGroupDto[];
}
