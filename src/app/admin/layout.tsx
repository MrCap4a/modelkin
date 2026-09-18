import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@modules/auth";
import { isAppError } from "@shared/errors";
import { AdminSidebar } from "./_components/admin-sidebar";

export const metadata: Metadata = {
  title: { default: "Панель ИТ", template: "%s — Панель ИТ" },
  // Admin screens must never be indexed or previewed publicly.
  robots: { index: false, follow: false },
};

/**
 * Root shell for every /admin/** screen (ТЗ §28). This is a completely
 * separate visual shell from the public site — no SiteChrome/SiteHeader/
 * SiteFooter, its own sidebar per design.pdf's admin mockups.
 *
 * `requireAdmin()` is checked on every request to this layout (SECURITY.md
 * → "Admin authorization" — role is always re-verified server-side, never
 * inferred from client UI state). A non-admin — including a logged-out
 * visitor — is redirected before any admin content renders, so there's no
 * flash of protected UI.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (isAppError(error)) {
      redirect(`/login?next=${encodeURIComponent("/admin")}`);
    }
    throw error;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        adminName={admin.name ?? admin.email}
        adminRoleLabel="Администратор"
        avatarUrl={admin.avatarUrl}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
