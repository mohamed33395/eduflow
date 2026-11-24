"use client";

import { useEffect, useState } from "react";
import { useLocalStorageValue } from "@/app/hooks/useLocalStorageValue";
import { getLessons, createLesson } from "@/app/services/lessons";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { uploadFile } from "@/app/services/storage";
import {
  LESSON_EXTS,
  uploadErrorMessage,
  validateUploadFile,
} from "@/app/lib/validators";
import { useI18n } from "@/app/lib/i18n/client";
import type { Lesson } from "@/app/types";

export default function CourseLessonsPage() {
  const { t } = useI18n();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const courseId = useLocalStorageValue("courseId");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    order: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (courseId) getLessons(courseId).then(setLessons);
  }, [courseId]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    const bad = validateUploadFile(f, { extensions: LESSON_EXTS });
    if (f && bad) {
      setFile(null);
      e.target.value = "";
      setError(t(bad));
      return;
    }
    setError("");
    if (f) setFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setUploading(true);
    setError("");
    try {
      let videoUrl = form.videoUrl;
      const files: Lesson["files"] = [];

      if (file) {
        const type = file.type.startsWith("video/")
          ? "videos"
          : file.type === "application/pdf"
          ? "pdfs"
          : "other";
        const res = await uploadFile(
          file,
          type,
          (p) => console.log(`Upload ${p}%`),
          { extensions: LESSON_EXTS }
        );
        if (type === "videos") videoUrl = res.url;
        else
          files.push({
            name: file.name,
            url: res.url,
            type:
              file.type === "application/pdf"
                ? "pdf"
                : file.type.startsWith("image/")
                ? "image"
                : "other",
          });
      }

      await createLesson({
        courseId,
        title: form.title,
        description: form.description,
        videoUrl,
        files,
        order: form.order,
      });
      setShowForm(false);
      setForm({ title: "", description: "", videoUrl: "", order: 1 });
      setFile(null);
      getLessons(courseId).then(setLessons);
    } catch (err) {
      console.error("[CourseLessonsPage] submit:", err);
      setError(uploadErrorMessage(err, t));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("lessons")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("cancel") : t("addLesson")}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <Input
            label={t("title")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label={t("description")}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <Input
            label={t("order")}
            type="number"
            value={form.order}
            onChange={(e) =>
              setForm({ ...form, order: Number(e.target.value) })
            }
          />
          <Input
            label={t("videoUrl")}
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
          />
          <Input
            type="file"
            label={t("uploadVideoPdf")}
            onChange={handleFile}
          />
          <Button type="submit" disabled={uploading}>
            {uploading ? t("uploading") : t("createLesson")}
          </Button>
        </form>
      )}

      <Table
        columns={[
          { key: "order", header: "#" },
          { key: "title", header: t("title") },
          { key: "description", header: t("description") },
          {
            key: "video",
            header: t("video"),
            render: (row: Lesson) =>
              row.videoUrl ? (
                <a
                  href={row.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                {t("watch")}
              </a>
            ) : (
              "—"
            ),
          },
        ]}
        rows={lessons}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
