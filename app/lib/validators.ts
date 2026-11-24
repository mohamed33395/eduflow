/**
 * Shared client-side validation helpers.
 *
 * These mirror the backend DTO rules — they exist for UX (fast feedback),
 * NOT security. The API still re-validates everything server-side.
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]+$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isBlank = (v: string | null | undefined): boolean =>
  !v || !v.trim();

export const isEmail = (v: string): boolean => EMAIL_PATTERN.test(v.trim());

export const isUsername = (v: string): boolean =>
  v.length >= 3 && v.length <= 50 && USERNAME_PATTERN.test(v);

// ── File upload validation ──────────────────────────────────────────

/** Matches the backend Postgres blob cap (50MB). */
export const MAX_UPLOAD_MB = 50;

export interface FileRule {
  /** Max size in MB (default: MAX_UPLOAD_MB). */
  maxMb?: number;
  /** Allowed lowercase extensions with dot, e.g. [".pdf", ".png"]. */
  extensions?: string[];
}

export const DOC_IMAGE_EXTS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
];

export const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

export const LESSON_EXTS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".mp4",
  ".webm",
  ".mov",
  ".mp3",
  ".zip",
];

export const fileExt = (name: string): string => {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
};

/**
 * Returns an i18n message key when the file breaks a rule, else null.
 * Keys: "fileTooLarge" | "fileTypeNotAllowed".
 */
export function validateUploadFile(
  file: File | null | undefined,
  rule: FileRule = {}
): string | null {
  if (!file) return "fieldRequired";
  const maxMb = rule.maxMb ?? MAX_UPLOAD_MB;
  if (file.size > maxMb * 1024 * 1024) return "fileTooLarge";
  if (rule.extensions?.length) {
    const ext = fileExt(file.name);
    if (!ext || !rule.extensions.includes(ext)) return "fileTypeNotAllowed";
  }
  return null;
}

/** Error thrown by uploadFile() when a file fails client validation. */
export class UploadValidationError extends Error {
  constructor(public readonly i18nKey: string) {
    super(i18nKey);
    this.name = "UploadValidationError";
  }
}

/** Translate any thrown error to a displayable message. */
export function uploadErrorMessage(
  err: unknown,
  t: (key: string, fallback?: string) => string
): string {
  if (err instanceof UploadValidationError) return t(err.i18nKey);
  return err instanceof Error ? err.message : t("error");
}
