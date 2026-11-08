import { Preloader, ScrollReveal, ScrollScenes } from "@/components/motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

// The public site's chrome. The admin (app/admin) has its own; the root layout holds what both share.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Preloader />
      <ScrollReveal />
      <ScrollScenes />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
