import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Cormorant_Garamond,
  Noto_Sans_JP,
  Inter,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RuntimeConfigNotice } from "@/components/layout/RuntimeConfigNotice";
import { NAV_ITEMS } from "@/config/demo-content";
import { getRuntimeConfig } from "@/lib/config/runtimeConfig";
import { getRuntimeCatalog } from "@/lib/config/runtimeCatalog";
import { resolveSiteConfig } from "@/lib/config/resolveSiteConfig";
import "./globals.css";

// Heading fonts — Japanese Mincho + a moderate-contrast Latin old-style
// serif so the two scripts read as one typographic family (Phase 2A §3).
// Only weight 500 is loaded: every heading role in the Phase 2A type scale
// uses weight 500, so a second weight would be unused bytes.
const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: "500",
  display: "swap",
});

// Body fonts — weights 400 (body/caption/nav) and 500 (button label) only.
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

// Dynamic per Phase 3B: title/description now reflect the runtime
// business name/tagline, so this can no longer be a static `metadata`
// export (Next.js requires `generateMetadata` for that). `getRuntimeConfig`
// is React-`cache()`-wrapped, so this call and the one in `RootLayout`
// below share a single GAS request per page load.
export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getRuntimeConfig();
  const siteConfig = resolveSiteConfig(config);
  return {
    title: `${siteConfig.business.name} | ${siteConfig.business.nameLatin}`,
    description: siteConfig.business.tagline,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ status, config }, { status: catalogStatus }] = await Promise.all([
    getRuntimeConfig(),
    getRuntimeCatalog(),
  ]);
  const siteConfig = resolveSiteConfig(config);
  // A configured-but-failing GAS backend must never be silently
  // indistinguishable from demo mode — this now covers both the
  // business-config call and the Menu/Staff catalog call (Phase 5.1),
  // reusing the same notice rather than inventing a second one.
  const showRuntimeNotice = status === "runtime-error" || catalogStatus === "runtime-error";

  return (
    <html
      lang="ja"
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        <RuntimeConfigNotice show={showRuntimeNotice} />
        <SiteHeader
          business={siteConfig.business}
          navItems={NAV_ITEMS}
          reservationEnabled={siteConfig.features.reservation}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter config={siteConfig} navItems={NAV_ITEMS} />
      </body>
    </html>
  );
}
