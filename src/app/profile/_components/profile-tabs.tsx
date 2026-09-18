import Link from "next/link";
import { clsx } from "@shared/utils/clsx";

export type ProfileTab = "profile" | "purchases" | "author" | "payments";

const BASE_TABS: { id: ProfileTab; href: string; label: string }[] = [
  { id: "profile", href: "/profile", label: "Мой профиль" },
  { id: "purchases", href: "/profile/purchases", label: "Купленные модели" },
];

const AUTHOR_TAB = { id: "author" as const, href: "/profile/author", label: "Мои модели на сайте" };
const PAYMENTS_TAB = { id: "payments" as const, href: "/profile/payments", label: "История платежей" };

/** Sub-nav shared by every /profile/** screen (design.pdf pages 9-13). Author tab only shown to authors. */
export function ProfileTabs({ active, showAuthorTab }: { active: ProfileTab; showAuthorTab: boolean }) {
  const tabs = [...BASE_TABS, ...(showAuthorTab ? [AUTHOR_TAB] : []), PAYMENTS_TAB];

  return (
    <nav className="mt-6 flex flex-wrap gap-6 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={clsx(
            "border-b-2 pb-3 text-sm font-medium transition-colors",
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-ink-muted hover:text-ink",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
