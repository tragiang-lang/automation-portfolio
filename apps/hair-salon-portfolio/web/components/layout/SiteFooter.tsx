"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { HOURS_DAY_ORDER, formatHours } from "@/lib/constants/hours";
import { resolveNavHref } from "@/lib/utils/navItems";
import type { NavItem, SiteConfig } from "@/types/content";

const SHORT_DAY_LABELS: Record<(typeof HOURS_DAY_ORDER)[number], string> = {
  monday: "月",
  tuesday: "火",
  wednesday: "水",
  thursday: "木",
  friday: "金",
  saturday: "土",
  sunday: "日",
};

/**
 * Site footer (Phase 2A §16) — the one section allowed to invert the
 * palette (Sumi background, on-primary text).
 */
export function SiteFooter({
  config,
  navItems,
}: {
  config: SiteConfig;
  navItems: NavItem[];
}) {
  const year = new Date().getFullYear();
  const pathname = usePathname();

  return (
    <footer className="bg-primary text-on-primary">
      <Container className="grid gap-12 py-16 lg:grid-cols-3 lg:gap-8 lg:py-24">
        <div>
          <p className="text-[20px] font-medium">{config.business.name}</p>
          <p className="mt-1 text-[12px] tracking-[0.08em] uppercase text-on-primary/70">
            {config.business.nameLatin}
          </p>
          <p className="mt-4 max-w-[32ch] text-[14px] leading-[1.6] text-on-primary/80">
            {config.business.tagline}
          </p>
          {config.socialLinks.length > 0 ? (
            <ul className="mt-6 flex gap-4">
              {config.socialLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[14px] underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <nav aria-label="フッターナビゲーション">
          <p className="text-[14px] tracking-[0.01em] text-on-primary/70">サイト内リンク</p>
          <ul className="mt-4 flex flex-col gap-3">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={resolveNavHref(item.href, pathname)} className="text-[15px] underline-offset-4 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-[14px] tracking-[0.01em] text-on-primary/70">営業時間・お問い合わせ</p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[14px]">
            {HOURS_DAY_ORDER.map((day) => (
              <div key={day} className="contents">
                <dt className="text-on-primary/70">{SHORT_DAY_LABELS[day]}</dt>
                <dd>{formatHours(config.hours[day])}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[14px] leading-[1.6]">
            {config.business.postalCode} {config.business.address}
            <br />
            {config.business.phone}
          </p>
          {config.features.reservation ? (
            <Button href="/reservation" variant="secondary" className="mt-6 border-on-primary/40! text-on-primary! hover:bg-on-primary/10!">
              {config.labels.bookingCta}
            </Button>
          ) : null}
        </div>
      </Container>

      <div className="border-t border-on-primary/15">
        <Container className="flex flex-col gap-3 py-6 text-[13px] text-on-primary/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {year} {config.business.nameLatin}
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="underline-offset-4 hover:underline">
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="underline-offset-4 hover:underline">
              利用規約
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
