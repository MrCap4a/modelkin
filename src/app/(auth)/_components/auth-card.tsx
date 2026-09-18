import type { ReactNode } from "react";

/** Shared white rounded-card shell used by every screen in the (auth) route group (design.pdf pages 5-8). */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-center px-4 py-16 sm:px-6">
      <div className="w-full max-w-[420px] rounded-card border border-border bg-surface p-8 shadow-card">
        <h1 className="text-center text-2xl font-bold text-ink">{title}</h1>
        {subtitle ? <p className="mt-2 text-center text-sm text-ink-muted">{subtitle}</p> : null}
        <div className="mt-6 flex flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}
