import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const UPLOAD_FOLDERS = [
  'avatars',
  'covers',
  'lessons',
  'submissions',
  'misc',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

export class PresignDto {
  // Any filename is accepted — safeName() normalizes it into the storage key,
  // so validation only needs to bound the input size.
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  filename!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;

  @IsOptional()
  @IsIn(UPLOAD_FOLDERS)
  folder?: UploadFolder;

  /** Optional scoping id — e.g. courseId for lessons, assignmentId for submissions. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[\w-]+$/, { message: 'scopeId may only contain letters, numbers, dash, underscore' })
  scopeId?: string;
}
