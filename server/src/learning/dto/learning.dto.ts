import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LessonFileType } from '@prisma/client';

// ── Lessons ──

export class LessonFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(1000)
  url!: string;

  @IsEnum(LessonFileType)
  type!: LessonFileType;
}

export class CreateLessonDto {
  @IsString()
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonFileDto)
  files?: LessonFileDto[];
}

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  videoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  /** Replaces the whole file list when provided. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonFileDto)
  files?: LessonFileDto[];
}

// ── Assignments ──

export class CreateAssignmentDto {
  @IsString()
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsDateString()
  deadline!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxGrade?: number;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxGrade?: number;
}

// ── Submissions ──

export class CreateSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  fileUrl?: string;

  @IsOptional()
  @IsString()
  text?: string;
}

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  grade!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
