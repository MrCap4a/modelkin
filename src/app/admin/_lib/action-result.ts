/** Shared shape every admin Server Action resolves to — never throws across the RSC boundary (mirrors src/app/profile/_components/action-result.ts). */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

interface FieldIssue {
  path: string;
  message: string;
}

/** Maps the ValidationError `details.issues` shape (see shared/errors/handle-error.ts) to a per-field map. */
export function fieldErrorsFrom(details: Record<string, unknown> | undefined): Record<string, string> {
  const issues = (details?.issues as FieldIssue[] | undefined) ?? [];
  const map: Record<string, string> = {};
  for (const issue of issues) {
    if (issue.path && !(issue.path in map)) {
      map[issue.path] = issue.message;
    }
  }
  return map;
}
