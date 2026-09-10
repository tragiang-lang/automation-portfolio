import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

/**
 * The reusable restated-CTA band (Phase 2A §6 row 7 / §12) — one CTA
 * style, reused at narratively justified points (after Gallery, and as
 * the final closing CTA before the footer). Never a floating/sticky
 * overlay; it's a normal section in the scroll flow. Restrained use of
 * the accent color per Phase 2A §2 — never a large background fill, so
 * this band uses the sunken surface tone, not `--color-accent`, as its
 * background.
 */
export function ReservationCtaBand({
  heading,
  message,
}: {
  heading: string;
  message: string;
}) {
  return (
    <section className="bg-surface-sunken py-16 lg:py-24">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-[32ch] text-[28px] leading-[1.28] font-medium tracking-[-0.005em] text-primary lg:text-[40px] lg:leading-[1.2]">
          {heading}
        </h2>
        <p className="max-w-[48ch] text-[16px] leading-[1.7] text-secondary">{message}</p>
        <Button href="/reservation">ご予約はこちら</Button>
      </Container>
    </section>
  );
}
