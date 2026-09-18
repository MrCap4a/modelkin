import { clsx } from "@shared/utils/clsx";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * A plain GET form to /models — works without client JS (crawlable, no
 * hydration required) and is shareable via URL. `hiddenFields` preserves the
 * catalog page's current tag/sort when searching from within it; submitting
 * always resets `page` back to 1 by simply not including it.
 */
export function SearchBar({
  defaultValue,
  hiddenFields,
  size = "default",
  placeholder = "Поиск моделей (например: держатель для телефона, кашпо)…",
}: {
  defaultValue?: string;
  hiddenFields?: Record<string, string | undefined>;
  size?: "default" | "compact";
  placeholder?: string;
}) {
  return (
    <form
      action="/models"
      method="GET"
      className={clsx(
        "flex w-full items-center gap-2 rounded-control border border-border bg-surface p-1.5 shadow-card",
        size === "compact" && "max-w-none",
      )}
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([key, value]) =>
          value ? <input key={key} type="hidden" name={key} value={value} /> : null,
        )}

      <span className="pl-2 text-ink-muted">
        <SearchIcon />
      </span>
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label="Поиск моделей"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Искать
      </button>
    </form>
  );
}
