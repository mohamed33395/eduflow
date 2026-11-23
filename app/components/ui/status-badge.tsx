import * as React from "react";
import { Badge, type BadgeProps } from "@/app/components/ui/badge";
import { cn } from "@/app/lib/utils";

type SemanticVariant = "success" | "warning" | "info" | "danger" | "neutral";

/**
 * Maps common entity status strings to a semantic variant.
 * Unknown statuses fall back to `neutral` so nothing renders unstyled.
 */
const STATUS_VARIANTS: Record<string, SemanticVariant> = {
  // success
  active: "success",
  paid: "success",
  present: "success",
  completed: "success",
  approved: "success",
  verified: "success",
  success: "success",
  submitted: "success",
  waived: "success",
  // warning
  pending: "warning",
  late: "warning",
  trial: "warning",
  scheduled: "warning",
  upcoming: "warning",
  partial: "warning",
  partially_paid: "warning",
  // info
  excused: "info",
  draft: "info",
  info: "info",
  new: "info",
  // danger
  inactive: "danger",
  suspended: "danger",
  absent: "danger",
  overdue: "danger",
  rejected: "danger",
  cancelled: "danger",
  canceled: "danger",
  failed: "danger",
  archived: "danger",
  unpaid: "danger",
  error: "danger",
};

export function statusVariant(status: string): SemanticVariant {
  return STATUS_VARIANTS[status.trim().toLowerCase()] ?? "neutral";
}

/** Colored dot + colored text — matches the screenshot's status columns. */
const DOT_STYLES: Record<SemanticVariant, { dot: string; text: string }> = {
  success: { dot: "bg-green-500", text: "text-green-700 dark:text-green-400" },
  warning: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  info: { dot: "bg-blue-500", text: "text-blue-700 dark:text-blue-400" },
  danger: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400" },
  neutral: { dot: "bg-slate-400", text: "text-slate-500 dark:text-slate-400" },
};

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Raw status string (e.g. "active", "pending", "overdue"). */
  status: string;
  /** Rendered label — usually the translated status text. */
  label: React.ReactNode;
  /** Force a semantic variant instead of the mapped one. */
  variant?: SemanticVariant;
  /** Render as a filled pill Badge instead of the dot style. */
  filled?: boolean;
}

export function StatusBadge({
  status,
  label,
  variant,
  filled = false,
  className,
  ...props
}: StatusBadgeProps) {
  const mapped = variant ?? statusVariant(status);

  if (filled) {
    return (
      <Badge variant={mapped as BadgeProps["variant"]} className={className}>
        {label}
      </Badge>
    );
  }

  const style = DOT_STYLES[mapped];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        style.text,
        className
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      {label}
    </span>
  );
}
