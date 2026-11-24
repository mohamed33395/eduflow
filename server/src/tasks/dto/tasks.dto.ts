import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class TaskFormDataQuery {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  subjectId!: string;
}

export class CreateTaskDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsString()
  subjectId!: string;

  /** TeacherProfile.id — the reviewer for this task's submissions. */
  @IsString()
  teacherId!: string;

  @IsOptional()
  @IsString()
  lessonId?: string;

  /** Uploaded exam file URL (from /uploads/presign flow). */
  @IsString()
  @MaxLength(1000)
  examFileUrl!: string;
}

export class SubmitTaskDto {
  /** Uploaded solution file URL. */
  @IsString()
  @MaxLength(1000)
  fileUrl!: string;
}

export class ReviewTaskSubmissionDto {
  @IsIn(['accept', 'reject'])
  action!: 'accept' | 'reject';

  /** Required when action = accept. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  grade?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}

export class SendResultDto {
  /**
   * Frontend sets this after the teacher sent the result manually through the
   * wa.me deep link (used when the WhatsApp API isn't configured).
   */
  @IsOptional()
  markOnly?: boolean;
}
