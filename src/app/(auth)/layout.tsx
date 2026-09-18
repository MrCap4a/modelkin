import { SiteChrome } from "@components/shared/site-chrome";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
