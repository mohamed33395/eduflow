import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Shared shape of the public landing-page content ("الملف التعريفي") that a
 * center or course owner edits from their dashboard. Stored as a single JSON
 * column (`landing_profile`) so adding new landing fields later doesn't
 * require a migration — extend this DTO and the frontend type together.
 *
 * `forbidNonWhitelisted` is on globally: every field must be declared here or
 * the PATCH request is rejected.
 */
export class LandingFeatureDto {
  @IsString()
  @MaxLength(150)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class LandingSocialsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  telegram?: string;
}

/**
 * Every user-facing string rendered on the public landing page can be
 * overridden here; a missing key falls back to the visitor's i18n default.
 */
export class LandingLabelsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  featuresTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  aboutTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  galleryTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  topStudentsTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  bookingTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bookingSubtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingRoleStudent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingRoleTeacher?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingNameLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingPhoneLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingEmailLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingMessageLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  bookingSubmitLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bookingSuccess?: string;
}

/** Per-section background-color overrides (hex/CSS color). */
export class LandingColorsDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  heroBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  featuresBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  aboutBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  topStudentsBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  galleryBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  bookingBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  footerBg?: string;

  /** Background of the inner white cards (features, students, contact…). */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cardBg?: string;

  /** Section headings color. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  titleColor?: string;

  /** Body/description text color. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  textColor?: string;
}

/** A highlighted student shown in the "top students" landing section. */
export class LandingTopStudentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  /** Achievement / grade / class — e.g. "الأول على المحافظة". */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  image?: string;
}

export class LandingProfileDto {
  /** false = landing page hidden (404). Missing/false-y defaults to visible. */
  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  about?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ctaLabel?: string;

  /** May be an absolute URL or an app-relative path like "/login". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  ctaUrl?: string;

  /** false = hide the hero call-to-action button. Missing = visible. */
  @IsOptional()
  @IsBoolean()
  ctaEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroImage?: string;

  /** Brand mark shown beside the hero title — falls back to the entity logo. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  heroLogo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  gallery?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => LandingFeatureDto)
  features?: LandingFeatureDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => LandingTopStudentDto)
  topStudents?: LandingTopStudentDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSocialsDto)
  socials?: LandingSocialsDto;

  /** CSS color used for the landing page accent (e.g. "#4f46e5"). */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  accentColor?: string;

  /** Meta line under the headline (e.g. overrides "group • primary • 6-6"). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  subtitle?: string;

  /** false = hide the booking-request form on the public page. */
  @IsOptional()
  @IsBoolean()
  bookingEnabled?: boolean;

  /** Footer line at the bottom of the page. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  footerText?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingLabelsDto)
  labels?: LandingLabelsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingColorsDto)
  colors?: LandingColorsDto;
}
