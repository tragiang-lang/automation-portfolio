import Link from "next/link";
import { siteConfig, siteContent } from "@/content/site";

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="inline-flex min-h-10 items-center text-sm font-bold tracking-wide">
          {siteConfig.brandName}
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          {siteContent.nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
        <a
          href="/#contact"
          className="inline-flex min-h-10 items-center rounded-lg border border-ink px-4 text-sm font-medium md:hidden"
        >
          Contact
        </a>
      </div>
    </header>
  );
}
