import { SiteChrome } from "@components/shared/site-chrome";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
