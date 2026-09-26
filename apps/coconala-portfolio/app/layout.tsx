import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Header } from "@/components/Header";
import { siteConfig, siteContent } from "@/content/site";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const ogImage = { url: "/demos/hair-salon/rich-menu.png", width: 2500, height: 1686 };

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: { default: siteConfig.title, template: `%s | ${siteConfig.title}` },
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.brandName,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: [ogImage.url],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body>
        <Header />
        <main>{children}</main>
        <footer className="border-t border-line px-4 py-8 text-center text-xs leading-relaxed text-muted sm:px-6">
          <p>{siteContent.footer.note}</p>
          <p className="mt-2">© {siteConfig.brandName}</p>
        </footer>
      </body>
    </html>
  );
}
