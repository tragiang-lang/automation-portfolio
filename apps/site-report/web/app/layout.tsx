import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "現場報告アプリ",
  description: "LIFF site report app — LINE login, site selection, report form, photos, and submission.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
