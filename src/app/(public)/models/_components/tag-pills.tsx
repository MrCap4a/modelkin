import Link from "next/link";
import { clsx } from "@shared/utils/clsx";

function pillClass(active: boolean): string {
  return clsx(
    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
    active
      ? "border-primary bg-primary text-white"
      : "border-border bg-surface text-ink hover:border-primary/40 hover:text-primary",
  );
}

/**
 * Plain links (no client JS) so filtering by tag stays a normal, shareable,
 * back-button-friendly navigation — changing tag always resets `page` back
 * to 1 by simply not including it in the built href.
 */
export function TagPills({
  tags,
  activeTagSlug,
  currentParams,
}: {
  tags: { slug: string; name: string }[];
  activeTagSlug?: string;
  currentParams: { q?: string; sort?: string };
}) {
  function hrefFor(tagSlug?: string): string {
    const params = new URLSearchParams();
    if (currentParams.q) params.set("q", currentParams.q);
    if (currentParams.sort) params.set("sort", currentParams.sort);
    if (tagSlug) params.set("tag", tagSlug);
    const qs = params.toString();
    return `/models${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={hrefFor(undefined)} className={pillClass(!activeTagSlug)}>
        Все
      </Link>
      {tags.map((tag) => (
        <Link key={tag.slug} href={hrefFor(tag.slug)} className={pillClass(activeTagSlug === tag.slug)}>
          {tag.name}
        </Link>
      ))}
    </div>
  );
}
