"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import { UploadCloud, X, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/app/lib/utils";
import { uploadFile, type UploadPath } from "@/app/services/storage";

interface ImageUploadProps {
  folder: string;
  onUpload: (url: string) => void;
  onUploading?: (uploading: boolean) => void;
  value?: string;
  required?: boolean;
  compact?: boolean;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export function ImageUpload({
  folder,
  onUpload,
  onUploading,
  value,
  required,
  compact = false,
  maxSizeMB = 5,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85,
}: ImageUploadProps) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<string>(value ?? "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [done, setDone] = useState(!!value);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewBlobRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    };
  }, []);

  useEffect(() => {
    if (value && value !== preview) {
      setPreview(value);
      setDone(true);
    }
  }, [value]);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError(t("invalidImageType"));
        return;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(t("imageTooLarge"));
        return;
      }

      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
      const blob = URL.createObjectURL(file);
      previewBlobRef.current = blob;
      setPreview(blob);
      setError("");
      setDone(false);
      setProgress(0);
      setUploading(true);
      onUploading?.(true);

      try {
        const compressed = await compressImage(file, maxWidth, maxHeight, quality);
        const uploadable = new File(
          [compressed],
          file.name.replace(/\.[^.]+$/, ".jpg"),
          { type: "image/jpeg" }
        );
        const { url } = await uploadFile(uploadable, folder as UploadPath, setProgress);
        onUpload(url);
        setDone(true);
        setProgress(100);
      } catch (err) {
        console.error("[ImageUpload] failed:", err);
        setError(err instanceof Error ? err.message : t("imageUploadFailed"));
        setPreview(value ?? "");
        setDone(!!value);
      } finally {
        setUploading(false);
        onUploading?.(false);
      }
    },
    [folder, maxSizeMB, maxWidth, maxHeight, quality, onUpload, onUploading, t, value]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
      previewBlobRef.current = "";
    }
    setPreview("");
    setDone(false);
    setError("");
    setProgress(0);
    onUpload("");
  };

  const hasPreview = !!preview;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {t("image")}
        {required && <span className="ms-1 text-danger">*</span>}
      </label>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={!uploading ? handleDrop : undefined}
        onClick={!uploading ? () => fileInputRef.current?.click() : undefined}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200",
          compact ? "min-h-[120px]" : "min-h-[180px]",
          uploading && "cursor-default",
          isDragging && !uploading
            ? "border-primary bg-primary/5 dark:bg-primary/10"
            : hasPreview && !uploading
            ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            : error
            ? "border-danger/40 bg-danger/5 dark:border-danger/30 dark:bg-danger/5"
            : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-primary"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {hasPreview ? (
          <>
            <img
              src={preview}
              alt={t("image")}
              className={cn(
                "w-full object-cover transition-opacity duration-200",
                compact ? "h-[120px]" : "h-[180px]",
                uploading && "opacity-40"
              )}
            />
            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/60 px-6 dark:bg-slate-900/60">
                <div className="w-full max-w-[200px] space-y-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t("uploadingImage")} {progress}%
                  </p>
                </div>
              </div>
            )}
            {!uploading && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-800 shadow transition hover:bg-white"
                >
                  <RefreshCw size={12} />
                  {t("changeImage")}
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1.5 rounded-lg bg-danger/90 px-3 py-1.5 text-xs font-medium text-white shadow transition hover:bg-danger"
                >
                  <X size={12} />
                  {t("cancel")}
                </button>
              </div>
            )}
            {done && !uploading && (
              <span className="absolute end-2 top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                <CheckCircle2 size={10} />
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div
              className={cn(
                "flex items-center justify-center rounded-full bg-primary/10 text-primary transition-transform duration-200",
                compact ? "h-10 w-10" : "h-14 w-14",
                isDragging && "scale-110"
              )}
            >
              <UploadCloud size={compact ? 20 : 26} />
            </div>
            <div className="space-y-1">
              <p className={cn("font-semibold text-slate-800 dark:text-slate-100", compact ? "text-sm" : "text-base")}>
                {isDragging ? t("uploadAndCropImage") : t("addImage")}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("clickToSelectImage")} · {maxSizeMB}MB max
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={13} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function compressImage(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
