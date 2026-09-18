import { SiteChrome } from "@components/shared/site-chrome";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
