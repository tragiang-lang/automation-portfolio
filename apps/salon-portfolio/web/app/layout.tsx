import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Cormorant_Garamond,
  Noto_Sans_JP,
  Inter,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { NAV_ITEMS, SITE_CONFIG } from "@/config/demo-content";
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

export const metadata: Metadata = {
  title: `${SITE_CONFIG.business.name} | ${SITE_CONFIG.business.nameLatin}`,
  description: SITE_CONFIG.business.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${shipporiMincho.variable} ${cormorantGaramond.variable} ${notoSansJP.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-text">
        <SiteHeader business={SITE_CONFIG.business} navItems={NAV_ITEMS} />
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter config={SITE_CONFIG} navItems={NAV_ITEMS} />
      </body>
    </html>
  );
}
