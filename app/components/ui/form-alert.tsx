import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/app/lib/utils";

type FormAlertVariant = "error" | "success" | "info";

const variantStyles: Record<FormAlertVariant, string> = {
  error:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300",
};

const variantIcons = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
} as const;

/**
 * Consistent inline banner for form feedback — replaces bare
 * `text-red-600` paragraphs scattered across pages.
 */
export function FormAlert({
  variant = "error",
  className,
  children,
}: {
  variant?: FormAlertVariant;
  className?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  const Icon = variantIcons[variant];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
        variantStyles[variant],
        className
      )}
    >
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <span className="leading-snug">{children}</span>
    </div>
  );
}
