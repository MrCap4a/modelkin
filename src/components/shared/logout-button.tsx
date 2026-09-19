import { logoutAction } from "./logout-action";

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M15 3h3a2 2 0 012 2v14a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Plain progressive-enhancement form — no client JS needed to log out. */
export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        aria-label="Выйти из аккаунта"
        title="Выйти"
        className="flex items-center text-ink-muted transition-colors hover:text-primary"
      >
        <LogoutIcon />
      </button>
    </form>
  );
}
