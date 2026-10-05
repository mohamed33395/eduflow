import { NextResponse, type NextRequest } from "next/server";
import { getStorageBucket } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createHash } from "crypto";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = formData.get("folder");

    if (!(file instanceof File) || typeof folder !== "string" || !folder) {
      return NextResponse.json(
        { error: "Missing file or folder" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be less than 50MB" },
        { status: 400 }
      );
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const uploadPath = `${folder}/${currentUser.uid}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
    } = process.env;

    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      try {
        const { url, path } = await uploadToCloudinary(
          buffer,
          file.type,
          folder,
          currentUser.uid,
          safeName,
          CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_API_KEY,
          CLOUDINARY_API_SECRET
        );
        console.log("[api/storage/upload] uploaded to Cloudinary:", path);
        return NextResponse.json({ url, path });
      } catch (err) {
        console.warn(
          "[api/storage/upload] Cloudinary failed, trying next fallback:",
          err instanceof Error ? err.message : err
        );
      }
    }

    const bucket = getStorageBucket();
    if (bucket) {
      try {
        console.log("[api/storage/upload] resolved bucket:", bucket.name);
        await bucket.file(uploadPath).save(buffer, {
          contentType: file.type,
          metadata: {
            contentType: file.type,
            metadata: { uploadedBy: currentUser.uid, folder },
          },
        });
        const [url] = await bucket.file(uploadPath).getSignedUrl({
          action: "read",
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5),
        });
        return NextResponse.json({ url, path: uploadPath });
      } catch (err) {
        console.warn(
          "[api/storage/upload] Firebase failed, falling back to local storage:",
          err instanceof Error ? err.message : err
        );
      }
    } else {
      console.warn(
        "[api/storage/upload] no Firebase bucket configured (billing/storage not enabled); using local storage fallback"
      );
    }

    // Local filesystem fallback
    if (!existsSync(LOCAL_UPLOADS_DIR)) {
      await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    }
    const dir = path.join(LOCAL_UPLOADS_DIR, folder, currentUser.uid);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${Date.now()}-${safeName}`);
    await writeFile(filePath, buffer);

    const localUrl = `/uploads/${folder}/${currentUser.uid}/${path.basename(filePath)}`;
    console.log("[api/storage/upload] saved locally:", localUrl);
    return NextResponse.json({ url: localUrl, path: uploadPath });
  } catch (err) {
    console.error("[api/storage/upload] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

function cloudinarySignature(
  params: Record<string, string>,
  apiSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${sorted}${apiSecret}`).digest("hex");
}

async function uploadToCloudinary(
  buffer: Buffer,
  contentType: string,
  folder: string,
  userId: string,
  safeName: string,
  cloudName: string,
  apiKey: string,
  apiSecret: string
): Promise<{ url: string; path: string }> {
  const cloudinaryFolder = `edu-flow/${folder}/${userId}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const publicId = `${Date.now()}-${safeName.replace(/\.[^.]+$/, "")}`;

  const base64 = buffer.toString("base64");
  const dataUri = `data:${contentType};base64,${base64}`;

  const signatureParams: Record<string, string> = {
    folder: cloudinaryFolder,
    public_id: publicId,
    timestamp,
  };
  const signature = cloudinarySignature(signatureParams, apiSecret);

  const formData = new FormData();
  formData.append("file", dataUri);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp);
  formData.append("signature", signature);
  formData.append("folder", cloudinaryFolder);
  formData.append("public_id", publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudinary upload failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as CloudinaryUploadResult;
  return { url: data.secure_url, path: data.public_id };
}
