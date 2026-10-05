export type UploadPath =
  | "avatars"
  | "centers"
  | "courses"
  | "images"
  | "pdfs"
  | "submissions"
  | "videos"
  | "other";

export interface UploadResult {
  url: string;
  path: string;
}

export async function uploadFile(
  file: File,
  path: UploadPath,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", path);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText) as {
            url: string;
            path: string;
          };
          resolve({ url: data.url, path: data.path });
        } catch {
          reject(new Error("Invalid upload response"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(data.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Upload failed (network error)"))
    );
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", "/api/storage/upload");
    xhr.withCredentials = true;
    xhr.send(formData);
  });
}
