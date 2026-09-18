import type { ReactNode } from "react";
import { ProfileTabs, type ProfileTab } from "./profile-tabs";

/** Shared "Личный кабинет" page shell (heading + tab sub-nav) used by every /profile/** screen. */
export function ProfileShell({
  heading,
  active,
  showAuthorTab,
  headerRight,
  breadcrumb,
  children,
}: {
  heading: string;
  active: ProfileTab;
  showAuthorTab: boolean;
  headerRight?: ReactNode;
  breadcrumb?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {breadcrumb}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-ink">{heading}</h1>
        {headerRight}
      </div>
      <ProfileTabs active={active} showAuthorTab={showAuthorTab} />
      <div className="mt-8">{children}</div>
    </div>
  );
}
