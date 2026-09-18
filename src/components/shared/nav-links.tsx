"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "@shared/utils/clsx";

const LINKS = [
  { href: "/", label: "Главная" },
  { href: "/models", label: "Каталог моделей" },
  { href: "/custom-order", label: "Индивидуальный заказ" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 md:flex">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "border-b-2 pb-0.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-ink hover:text-primary",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
