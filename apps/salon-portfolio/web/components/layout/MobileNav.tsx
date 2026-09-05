"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { NavItem } from "@/types/content";

/**
 * Full-screen mobile navigation panel (Phase 2A §7/§22). Keyboard
 * accessible: opening moves focus into the panel, `Escape` closes it and
 * returns focus to the toggle button that opened it.
 */
export function MobileNav({
  open,
  onClose,
  navItems,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="サイト内メニュー"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-[16px] font-medium text-primary">メニュー</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="メニューを閉じる"
          className="flex h-11 w-11 items-center justify-center rounded-sm text-primary"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6L18 18M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <nav aria-label="メインナビゲーション" className="flex flex-1 flex-col justify-center gap-2 px-8">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                className="block py-4 text-[20px] font-medium text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Button href="/reservation" fullWidth className="mt-6">
          ご予約はこちら
        </Button>
      </nav>
    </div>
  );
}
