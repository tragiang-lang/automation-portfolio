import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { MenuCategory } from "@/components/sections/MenuCategory";
import type { Service } from "@/types/content";

const GROUPING_THRESHOLD = 6;

/**
 * Groups services by category, but only when there are enough services to
 * warrant it (Phase 2A §9: "grouping UI is simply not rendered when
 * there's only one implicit category"). Grouping is data-driven off
 * `service.category`, never a hard-coded category list.
 */
export function groupServices(
  services: Service[],
): Array<{ category?: string; services: Service[] }> {
  if (services.length <= GROUPING_THRESHOLD) {
    return [{ services }];
  }

  const order: string[] = [];
  const byCategory = new Map<string, Service[]>();
  for (const service of services) {
    const key = service.category ?? "その他";
    if (!byCategory.has(key)) {
      order.push(key);
      byCategory.set(key, []);
    }
    byCategory.get(key)!.push(service);
  }

  if (order.length <= 1) {
    return [{ services }];
  }

  return order.map((category) => ({ category, services: byCategory.get(category)! }));
}

export function MenuSection({ services }: { services: Service[] }) {
  const groups = groupServices(services);

  return (
    <section id="menu" className="bg-surface py-16 lg:py-24">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Menu"
            title="メニュー"
            subtitle="施術時間は目安です。カウンセリングのお時間を含め、少し余裕を持ってご来店ください。"
          />
        </Reveal>
        <Reveal delayMs={120} className="mt-12">
          <div>
            {groups.map((group, index) => (
              <MenuCategory
                key={group.category ?? index}
                category={group.category}
                services={group.services}
              />
            ))}
          </div>
        </Reveal>
        <div className="mt-12 flex justify-center">
          <Button href="/reservation">ご予約はこちら</Button>
        </div>
      </Container>
    </section>
  );
}
