type ClassValue = string | number | false | null | undefined;

/** Minimal `clsx`-alike: joins truthy class fragments, skipping falsy ones. */
export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
