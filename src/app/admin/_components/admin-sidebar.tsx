"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@shared/utils/clsx";
import {
  AuditIcon,
  DashboardIcon,
  LogoMark,
  ModelsIcon,
  PaymentsIcon,
  PayoutIcon,
  RequestsIcon,
  TagIcon,
  UsersIcon,
} from "./admin-icons";

interface NavItem {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.JSX.Element;
  /** Only this route highlights active — nested routes (e.g. /admin/models/[id]) still fall under it. */
  matchPrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/models", label: "Модели", icon: ModelsIcon, matchPrefix: true },
  { href: "/admin/tags", label: "Категории", icon: TagIcon },
  { href: "/admin/custom-orders", label: "Заявки", icon: RequestsIcon, matchPrefix: true },
  { href: "/admin/users", label: "Пользователи", icon: UsersIcon },
  { href: "/admin/payments", label: "Платежи", icon: PaymentsIcon },
  { href: "/admin/payouts", label: "Выплаты авторам", icon: PayoutIcon, matchPrefix: true },
  { href: "/admin/audit", label: "Audit", icon: AuditIcon },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.matchPrefix) {
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
  return pathname === item.href;
}

export function AdminSidebar({
  adminName,
  adminRoleLabel,
  avatarUrl,
}: {
  adminName: string;
  adminRoleLabel: string;
  avatarUrl: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-border bg-surface px-4 py-6">
      <Link href="/admin" className="flex items-center gap-2.5 px-1">
        <LogoMark className="text-primary" />
        <span>
          <span className="block text-base font-bold leading-tight text-ink">Моделкин</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-primary">
            Панель ИТ
          </span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-subtle text-primary"
                  : "text-ink-muted hover:bg-surface-alt hover:text-ink",
              )}
            >
              <Icon className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-alt text-sm font-semibold text-ink-muted">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- public S3 URL, not a local/optimizable asset
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            adminName.charAt(0).toUpperCase()
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{adminName}</span>
          <span className="block truncate text-xs text-ink-muted">{adminRoleLabel}</span>
        </span>
      </div>
    </aside>
  );
}
