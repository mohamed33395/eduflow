import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Public payload posted by the booking form on a center/course landing page.
 * Exactly one of `centerSlug`/`courseSlug` must identify the landing page the
 * request was submitted from.
 */
export class CreateLandingRequestDto {
  /** "student" = wants to enroll, "teacher" = wants to teach. */
  @IsIn(['student', 'teacher'])
  role!: 'student' | 'teacher';

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(30)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  centerSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  courseSlug?: string;

  /** Honeypot — hidden input; bots fill it, humans never do. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  website?: string;
}

export class UpdateLandingRequestStatusDto {
  @IsIn(['pending', 'contacted', 'accepted', 'rejected'])
  status!: 'pending' | 'contacted' | 'accepted' | 'rejected';
}
