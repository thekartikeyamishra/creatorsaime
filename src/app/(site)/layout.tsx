import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PointerFX } from "@/components/pointer-fx";
import { AdSenseScript } from "@/components/ads";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
      <PointerFX />
      <AdSenseScript />
    </>
  );
}
