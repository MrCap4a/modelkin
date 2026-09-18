// Pure domain rule — no server-only / Next.js imports.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Decides which email address (if any) a best-effort notification should go
 * to. A logged-in user's account email always wins; for a guest, we only
 * have an email address to send to if they happened to enter one as their
 * contact value (e.g. contactType TELEGRAM/MAX but they typed an email
 * anyway) — custom orders don't have a dedicated EMAIL contact type per
 * ТЗ §26, so this is a best-effort heuristic, not a guarantee.
 */
export function extractEmailCandidate(params: {
  contactValue: string;
  userEmail?: string | null;
}): string | null {
  if (params.userEmail) return params.userEmail;
  const trimmed = params.contactValue.trim();
  return EMAIL_REGEX.test(trimmed) ? trimmed : null;
}
