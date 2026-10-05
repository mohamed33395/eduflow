"use client";

import { useEffect, useState } from "react";
import { getLessons, createLesson } from "@/app/services/lessons";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { uploadFile } from "@/app/services/storage";
import { useI18n } from "@/app/lib/i18n/client";
import type { Lesson } from "@/app/types";

export default function CourseLessonsPage() {
  const { t } = useI18n();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courseId, setCourseId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    order: 1,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("courseId") || "";
    setCourseId(id);
    if (id) getLessons(id).then(setLessons);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;
    setUploading(true);
    let videoUrl = form.videoUrl;
    let files: Lesson["files"] = [];

    if (file) {
      const type = file.type.startsWith("video/")
        ? "videos"
        : file.type === "application/pdf"
        ? "pdfs"
        : "other";
      const res = await uploadFile(
        file,
        type,
        (p) => console.log(`Upload ${p}%`)
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
    setUploading(false);
    setShowForm(false);
    setForm({ title: "", description: "", videoUrl: "", order: 1 });
    setFile(null);
    getLessons(courseId).then(setLessons);
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
