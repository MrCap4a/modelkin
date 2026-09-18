import { clsx } from "@shared/utils/clsx";

export function StatCard({
  label,
  value,
  growthPct,
  icon,
}: {
  label: string;
  value: string;
  /** null when there's no meaningful baseline to compare against. */
  growthPct: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
      {growthPct !== null && (
        <p className="mt-1.5 text-xs text-ink-muted">
          <span className={clsx("font-semibold", growthPct >= 0 ? "text-success" : "text-danger")}>
            {growthPct >= 0 ? "+" : ""}
            {growthPct}%
          </span>{" "}
          за последние 30 дней
        </p>
      )}
    </div>
  );
}
