import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { EducationLevel, Status } from '@prisma/client';

// ── Courses ──
export class CreateCourseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsString()
  @MaxLength(50)
  type!: string;

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

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  /** Super admin only: assign the course to a specific course-owner user. */
  @IsOptional()
  @IsString()
  ownerId?: string;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeTo?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

// ── Classes ──
export class CreateClassDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

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
  centerId?: string;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(EducationLevel)
  level?: EducationLevel;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  gradeTo?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}

// ── Subjects ──
export class CreateSubjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
