import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceEntryDto {
  @IsString()
  userId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class MarkAttendanceDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  /** Defaults to today (UTC). */
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class ListAttendanceQuery {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
