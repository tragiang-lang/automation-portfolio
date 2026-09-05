import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { StaffCard } from "@/components/sections/StaffCard";
import { AnyAvailableStaffCard } from "@/components/sections/AnyAvailableStaffCard";
import type { StaffMember } from "@/types/content";

/**
 * Staff grid (Phase 2A §6/§10). `enabled` mirrors
 * `CONFIG.features.staffSelection` — when false this section renders
 * nothing at all (not just visually hidden), matching Phase 0 §K: a
 * shared-calendar salon has no staff-selection concept in the DOM.
 */
export function StaffSection({
  enabled,
  staff,
  anyAvailableOption,
  businessNameInitial,
}: {
  enabled: boolean;
  staff: StaffMember[];
  anyAvailableOption: boolean;
  businessNameInitial: string;
}) {
  if (!enabled) return null;

  return (
    <section id="staff" className="bg-background py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Staff" title="スタッフ紹介" />
        </Reveal>
        <Reveal delayMs={120}>
          <ul className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {staff.map((member) => (
              <li key={member.staffId}>
                <StaffCard staff={member} />
              </li>
            ))}
            {anyAvailableOption ? (
              <li>
                <AnyAvailableStaffCard initial={businessNameInitial} />
              </li>
            ) : null}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
