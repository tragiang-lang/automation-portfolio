"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "@/components/layout/MobileNav";
import { cn } from "@/lib/utils/cn";
import { resolveNavHref } from "@/lib/utils/navItems";
import type { BusinessInfo, NavItem } from "@/types/content";

/**
 * Sticky-behaving header (Phase 2A §7). Implemented with `position: fixed`
 * rather than literal CSS `sticky` so it can render fully transparent over
 * the hero image on first load (§8) — a true `sticky` element still
 * occupies flow height, which would push the hero down instead of letting
 * the header float over it. Every non-hero section already carries at
 * least `py-16` (64px) of its own vertical padding (Phase 2A §4), which
 * comfortably clears this header's rendered height, so no separate
 * "content pushed down" compensation is needed anywhere else.
 */
export function SiteHeader({
  business,
  navItems,
  reservationEnabled = true,
  overDarkHeroImage = true,
}: {
  business: BusinessInfo;
  navItems: NavItem[];
  reservationEnabled?: boolean;
  /**
   * True only when the homepage's top is `HeroFullscreen` — the one Hero
   * variant (V1.1 Task 5) that is a full-bleed dark photo with a legibility
   * scrim, which this transparent/`text-on-primary` header state was built
   * to float over (§8). `HeroSplit`/`HeroEditorial` start with an ordinary
   * light section background, so floating white nav text over it would be
   * unreadable — `app/layout.tsx` passes
   * `designConfig.heroVariant === "fullscreen"` here. Defaults to `true` so
   * every non-homepage route (where `isHome` already makes this a no-op)
   * and every existing test call site keep today's behavior unchanged.
   */
  overDarkHeroImage?: boolean;
}) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 24);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const transparent = isHome && overDarkHeroImage && !scrolled && !mobileOpen;

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[background-color,padding,border-color] duration-200 motion-reduce:transition-none",
          transparent
            ? "border-b border-transparent bg-transparent py-6"
            : "border-b border-border bg-background/95 py-3 backdrop-blur-sm",
        )}
      >
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className={cn(
              "flex items-baseline gap-2 leading-none",
              transparent ? "text-on-primary" : "text-primary",
            )}
          >
            <span className="text-[20px] font-medium">{business.name}</span>
            <span className="hidden text-[12px] tracking-[0.08em] uppercase sm:inline">
              {business.nameLatin}
            </span>
          </Link>

          <nav
            aria-label="メインナビゲーション"
            className={cn(
              "hidden items-center gap-8 text-[15px] lg:flex",
              transparent ? "text-on-primary" : "text-primary",
            )}
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={resolveNavHref(item.href, pathname)}
                className="underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* The visibility toggle lives on this wrapper, not on the
                Button itself: Button's own base classes hardcode
                `inline-flex` (Button.tsx), which — being an unprefixed
                utility on the same `display` property — can beat an
                unprefixed `hidden` passed in via className regardless of
                viewport, since Tailwind only guarantees a responsive
                variant overrides its own base utility, not an unrelated
                one. Toggling display on a wrapper sidesteps that clash
                entirely. */}
            {reservationEnabled ? (
              <>
                <div className="hidden sm:block">
                  <Button href="/reservation">ご予約はこちら</Button>
                </div>
                <div className="sm:hidden">
                  <Button href="/reservation" aria-label="ご予約はこちら">
                    予約
                  </Button>
                </div>
              </>
            ) : null}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="メニューを開く"
              aria-expanded={mobileOpen}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-sm lg:hidden",
                transparent ? "text-on-primary" : "text-primary",
              )}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 7H20M4 12H20M4 17H20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        navItems={navItems}
        triggerRef={menuButtonRef}
        reservationEnabled={reservationEnabled}
      />
    </>
  );
}
