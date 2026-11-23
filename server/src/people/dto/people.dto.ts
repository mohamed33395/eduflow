import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CompensationType, EducationLevel, Gender } from '@prisma/client';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;

export class SubjectAssignmentDto {
  @IsString()
  subjectId!: string;

  @IsEnum(EducationLevel)
  level!: EducationLevel;

  @IsInt()
  @Min(1)
  @Max(12)
  gradeFrom!: number;

  @IsInt()
  @Min(1)
  @Max(12)
  gradeTo!: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  track?: string;
}

// ── Students ──

export class CreateStudentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only contain letters, numbers, dot, dash, underscore',
  })
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  primaryTeacherId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  courseIds?: string[];
}

export class UpdateStudentDto {
  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  grade?: number;

  @IsOptional()
  @IsString()
  classId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  parentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentPhone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  primaryTeacherId?: string | null;
}

export class EnrollDto {
  @IsString()
  courseId!: string;
}

export class AssignSubjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  assignments!: SubjectAssignmentDto[];
}

// ── Teachers ──

export class CreateTeacherDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(USERNAME_PATTERN, {
    message: 'username may only contain letters, numbers, dot, dash, underscore',
  })
  username!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsIn([CompensationType.FIXED, CompensationType.PERCENTAGE])
  compensationType!: CompensationType;

  /** Required when compensationType = FIXED (monthly amount). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  /** Required when compensationType = PERCENTAGE (1–100). */
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  commissionPercent?: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  classIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubjectAssignmentDto)
  subjectAssignments?: SubjectAssignmentDto[];
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsIn([CompensationType.FIXED, CompensationType.PERCENTAGE])
  compensationType?: CompensationType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  commissionPercent?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  classIds?: string[];
}
