import type { DashboardMonthlyPoint } from "@modules/admin";

/**
 * Plain CSS bar chart — no charting library is in package.json and adding
 * one is out of scope for this slice (12 bars, no interactivity needed
 * beyond the PDF mockup). Bar heights are relative to the maximum value in
 * the series.
 */
export function SalesChart({ points }: { points: DashboardMonthlyPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.totalAmount));

  return (
    <div className="flex h-48 items-end gap-2 sm:gap-3">
      {points.map((point, index) => {
        const heightPct = Math.max(4, Math.round((point.totalAmount / max) * 100));
        return (
          <div key={`${point.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-40 w-full items-end">
              <div
                className="w-full rounded-t-md bg-primary transition-all"
                style={{ height: `${heightPct}%` }}
                title={`${point.label}: ${(point.totalAmount / 100).toLocaleString("ru-RU")} ₽`}
              />
            </div>
            <span className="text-[11px] text-ink-muted">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}
