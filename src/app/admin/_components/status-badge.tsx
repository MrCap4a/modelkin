import { clsx } from "@shared/utils/clsx";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE_CLASS: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-primary-subtle text-primary",
  neutral: "bg-surface-alt text-ink-muted",
};

export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[tone])}>
      {label}
    </span>
  );
}
