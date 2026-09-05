import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "text";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm px-6 py-3 text-[16px] font-medium tracking-[0.02em] transition-colors duration-150 motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent hover:bg-[#833d33] disabled:hover:bg-accent",
  secondary:
    "border border-secondary text-primary bg-transparent hover:bg-surface-sunken",
  // No color here on purpose — callers set the text color via `className`
  // (e.g. `text-accent` on light backgrounds, `text-on-primary` over the
  // hero image) so this variant never fights a caller's override.
  text: "underline-offset-4 hover:underline px-2 py-2",
};

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  fullWidth?: boolean;
}

interface ButtonAsButton
  extends CommonProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> {
  href?: undefined;
}

interface ButtonAsLink
  extends CommonProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> {
  href: string;
  type?: undefined;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

/**
 * The single button component for every primary/secondary/text action in
 * the site (Phase 2A §17). Renders an `<a>` (via next/link) when `href` is
 * given, a real `<button>` otherwise — never a `<div onClick>`.
 */
export function Button(props: ButtonProps) {
  const { children, variant = "primary", className, fullWidth } = props;
  const classes = cn(base, variants[variant], fullWidth && "w-full", className);

  if ("href" in props && props.href !== undefined) {
    const {
      href,
      children: _linkChildren,
      variant: _linkVariant,
      className: _linkClassName,
      fullWidth: _linkFullWidth,
      type: _linkType,
      ...anchorRest
    } = props;
    const isExternal = href.startsWith("http");
    if (isExternal) {
      return (
        <a href={href} className={classes} target="_blank" rel="noreferrer" {...anchorRest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorRest}>
        {children}
      </Link>
    );
  }

  const {
    type = "button",
    children: _children,
    variant: _variant,
    className: _className,
    fullWidth: _fullWidth,
    ...rest
  } = props as ButtonAsButton;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
