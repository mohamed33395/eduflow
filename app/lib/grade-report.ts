import type { Assignment, Submission } from "@/app/types";

export interface GradeRow {
  sub: Submission;
  assignment: Assignment;
  month: string;
  pct: number | null;
}

export type RatingKey =
  | "ratingExcellent"
  | "ratingVeryGood"
  | "ratingGood"
  | "ratingNeedsWork"
  | "ratingPending";

export function ratingKey(avg: number | null): RatingKey {
  if (avg === null) return "ratingPending";
  if (avg >= 90) return "ratingExcellent";
  if (avg >= 75) return "ratingVeryGood";
  if (avg >= 50) return "ratingGood";
  return "ratingNeedsWork";
}

export function fill(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, v),
    template
  );
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function baseHtml(dir: string, lang: string, title: string, body: string) {
  return `<!doctype html>
<html dir="${dir}" lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0f172a; padding: 40px; }
</style>
</head>
<body>${body}</body>
</html>`;
}

/** Styled, printable grade-report document downloaded as an .html file. */
export function buildResultHtml(opts: {
  dir: "rtl" | "ltr";
  lang: string;
  studentName: string;
  subjectName: string;
  rows: GradeRow[];
  avg: number | null;
  ratingLabel: string;
  labels: {
    reportCard: string;
    studentName: string;
    subject: string;
    exam: string;
    examResults: string;
    grade: string;
    feedback: string;
    notGraded: string;
    overallRating: string;
    month: string;
  };
}) {
  const { dir, lang, studentName, subjectName, rows, avg, ratingLabel, labels } = opts;
  const maxOf = (r: GradeRow) => r.assignment.maxGrade ?? 100;
  const rowsHtml = rows
    .map((r) => {
      const graded = r.sub.grade !== undefined;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${esc(r.assignment.title)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${esc(r.month)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:700;">
          ${graded ? `${r.sub.grade} / ${maxOf(r)}` : esc(labels.notGraded)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;">
          ${esc(r.sub.feedback ?? "")}
        </td>
      </tr>`;
    })
    .join("");

  const body = `
<div style="max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
  <div style="background:#0f766e;color:#fff;padding:24px 28px;">
    <h1 style="font-size:22px;">${esc(labels.reportCard)}</h1>
    <p style="opacity:.85;margin-top:6px;font-size:14px;">
      ${esc(labels.studentName)}: ${esc(studentName)} &nbsp;•&nbsp;
      ${esc(labels.subject)}: ${esc(subjectName)}
    </p>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <thead>
      <tr style="background:#f1f5f9;text-align:${dir === "rtl" ? "right" : "left"};">
        <th style="padding:10px 12px;">${esc(labels.exam)}</th>
        <th style="padding:10px 12px;">${esc(labels.month)}</th>
        <th style="padding:10px 12px;">${esc(labels.grade)}</th>
        <th style="padding:10px 12px;">${esc(labels.feedback)}</th>
      </tr>
    </thead>
    <tbody style="text-align:${dir === "rtl" ? "right" : "left"};">${rowsHtml}</tbody>
  </table>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:18px 28px;background:#f8fafc;">
    <span style="font-size:14px;color:#475569;">${esc(labels.overallRating)}</span>
    <strong style="font-size:18px;color:${avg !== null && avg >= 50 ? "#059669" : "#e11d48"};">
      ${avg !== null ? `${avg}%` : "—"} — ${esc(ratingLabel)}
    </strong>
  </div>
</div>`;

  return baseHtml(dir, lang, labels.reportCard, body);
}

/** Elegant printable certificate document. */
export function buildCertificateHtml(opts: {
  dir: "rtl" | "ltr";
  lang: string;
  studentName: string;
  subjectName: string;
  period: string;
  ratingLabel: string;
  labels: {
    certificateOfAppreciation: string;
    certificateText: string;
    certificateSigner: string;
    date: string;
  };
}) {
  const { dir, lang, studentName, subjectName, period, ratingLabel, labels } = opts;
  const text = fill(labels.certificateText, {
    name: studentName,
    subject: subjectName,
    period,
  });
  const today = new Date().toLocaleDateString(dir === "rtl" ? "ar-EG" : "en-GB");

  const body = `
<div style="max-width:800px;margin:40px auto;padding:56px 64px;border:8px double #0f766e;border-radius:12px;text-align:center;position:relative;">
  <div style="font-size:42px;">🏆</div>
  <h1 style="font-size:30px;color:#0f766e;margin-top:12px;">${esc(labels.certificateOfAppreciation)}</h1>
  <p style="margin-top:28px;font-size:17px;line-height:2;color:#334155;">${esc(text)}</p>
  <p style="margin-top:14px;font-size:20px;font-weight:700;color:#0f172a;">
    ${esc(ratingLabel)}
  </p>
  <div style="display:flex;justify-content:space-between;margin-top:64px;font-size:13px;color:#64748b;">
    <div>
      <p style="border-top:1px solid #cbd5e1;padding-top:6px;min-width:160px;">
        ${esc(labels.certificateSigner)}
      </p>
    </div>
    <div>
      <p>${esc(labels.date)}</p>
      <p style="margin-top:4px;font-weight:600;color:#0f172a;">${today}</p>
    </div>
  </div>
</div>`;

  return baseHtml(dir, lang, labels.certificateOfAppreciation, body);
}

/** WhatsApp message summarising the subject results for the parent. */
export function buildParentMessage(opts: {
  locale: "ar" | "en";
  studentName: string;
  subjectName: string;
  avg: number | null;
  ratingLabel: string;
  rows: GradeRow[];
  labels: { reportCard: string; overallRating: string; notGraded: string };
}) {
  const { locale, studentName, subjectName, avg, ratingLabel, rows, labels } = opts;
  const lines = rows.map((r) => {
    const max = r.assignment.maxGrade ?? 100;
    const score =
      r.sub.grade !== undefined ? `${r.sub.grade}/${max}` : labels.notGraded;
    return `• ${r.assignment.title} (${r.month}): ${score}`;
  });
  if (locale === "ar") {
    return [
      `📋 ${labels.reportCard} — ${subjectName}`,
      `الطالب: ${studentName}`,
      `المتوسط: ${avg !== null ? `${avg}%` : "—"} (${ratingLabel})`,
      "",
      ...lines,
    ].join("\n");
  }
  return [
    `📋 ${labels.reportCard} — ${subjectName}`,
    `Student: ${studentName}`,
    `Average: ${avg !== null ? `${avg}%` : "—"} (${ratingLabel})`,
    "",
    ...lines,
  ].join("\n");
}

/** Trigger a file download for an HTML document string. */
export function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a new window containing the document and trigger print. */
export function printHtml(html: string) {
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.onload = () => w.print();
  setTimeout(() => w.print(), 400);
}
