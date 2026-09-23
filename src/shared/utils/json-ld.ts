/**
 * Serializes a JSON-LD object for embedding via `dangerouslySetInnerHTML`
 * into a `<script type="application/ld+json">` tag (SEO audit,
 * 2026-09-21). Plain `JSON.stringify` does not escape `<`, so a value
 * containing the literal string `</script>` (e.g. a model title or an
 * admin-written SEO description) would prematurely close the script tag
 * when the browser HTML-parses the response — this is the standard fix:
 * `<` is a valid JSON escape for `<` and round-trips back to `<`
 * through any JSON.parse (including whatever reads the structured data),
 * so it's semantically invisible to consumers while defusing the HTML
 * injection.
 */
export function toJsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
