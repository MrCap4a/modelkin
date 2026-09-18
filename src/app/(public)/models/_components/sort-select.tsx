"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { CatalogSort } from "@modules/catalog";

const OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: "popular", label: "Сначала популярные" },
  { value: "newest", label: "Сначала новые" },
  { value: "price_asc", label: "Сначала дешёвые" },
  { value: "price_desc", label: "Сначала дорогие" },
];

/**
 * The only genuinely interactive piece of the catalog filter bar (a native
 * `<select>` needs `onChange` to auto-navigate) — everything else on this
 * page is plain server-rendered links/forms. Always resets `page` when the
 * sort changes.
 */
export function SortSelect({ value }: { value: CatalogSort }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", event.target.value);
    params.delete("page");
    router.push(`/models?${params.toString()}`);
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      aria-label="Сортировка"
      className="rounded-control border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink focus:outline-none"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
