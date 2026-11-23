import { api } from "@/app/lib/api";

export type UploadPath =
  | "avatars"
  | "centers"
  | "courses"
  | "images"
  | "pdfs"
  | "submissions"
  | "tasks"
  | "videos"
  | "other";

export interface UploadResult {
  url: string;
  path: string;
}

/** Frontend upload folder → backend presign folder. */
const FOLDER_MAP: Record<UploadPath, string> = {
  avatars: "avatars",
  centers: "covers",
  courses: "covers",
  images: "lessons",
  pdfs: "lessons",
  videos: "lessons",
  submissions: "submissions",
  // Backend allows only avatars|covers|lessons|submissions|misc — no "tasks".
  tasks: "lessons",
  other: "misc",
};

export async function uploadFile(
  file: File,
  path: UploadPath,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // 1) request a presigned PUT URL from the backend.
  // The backend validates filename with /^[\w.\- ]+$/ — replace anything else
  // (Arabic letters, parentheses…) or the request fails with a generic 400.
  const filename = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 150);
  const presign = (await api.post<{
    uploadUrl: string;
    key: string;
    publicUrl?: string;
  }>("/uploads/presign", {
    filename,
    contentType: file.type || "application/octet-stream",
    folder: FOLDER_MAP[path] ?? "misc",
  })) as { uploadUrl: string; key: string; publicUrl?: string };

  // 2) PUT the file straight to object storage (progress via XHR)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status}`));
    });
    xhr.addEventListener("error", () =>
      reject(new Error("Upload failed (network error)"))
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));
    xhr.open("PUT", presign.uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    );
    xhr.send(file);
  });

  if (!presign.publicUrl) {
    throw new Error(
      "Upload succeeded but no public URL is configured (S3_PUBLIC_BASE_URL missing)"
    );
  }
  return { url: presign.publicUrl, path: presign.key };
}
