import { PASSWORD_REQUIREMENTS } from "@modules/auth";

/** Live checklist matching design.pdf page 8 ("ТРЕБОВАНИЯ К ПАРОЛЮ"). */
export function PasswordRequirementsList({ password }: { password: string }) {
  return (
    <div className="rounded-control border border-border bg-surface-alt p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Требования к паролю:</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.test(password);
          return (
            <li key={requirement.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden className={met ? "text-success" : "text-ink-muted"}>
                {met ? "✓" : "○"}
              </span>
              <span className={met ? "text-ink" : "text-ink-muted"}>{requirement.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
