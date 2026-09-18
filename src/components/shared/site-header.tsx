import Link from "next/link";
import { getCurrentUser } from "@modules/auth";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { CartBadge } from "./cart-badge";

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM4 21c1.4-3.6 4.5-6 8-6s6.6 2.4 8 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l1 12a2 2 0 002 2h9a2 2 0 002-2l1-9H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="21" r="1.4" fill="currentColor" />
      <circle cx="18" cy="21" r="1.4" fill="currentColor" />
    </svg>
  );
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Logo />
          <NavLinks />
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/cart"
            aria-label="Корзина"
            className="relative text-ink transition-colors hover:text-primary"
          >
            <CartIcon />
            <CartBadge />
          </Link>

          {user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-primary"
            >
              <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-ink-muted">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar source is an S3 signed/public URL, not a local asset
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon />
                )}
              </span>
              <span className="hidden sm:inline">{user.name ?? user.email}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 text-sm font-medium text-ink transition-colors hover:text-primary"
            >
              <UserIcon />
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
