import { ContactSection } from "@/components/sections/ContactSection";
import { SITE_CONFIG } from "@/config/demo-content";

export default function ContactPage() {
  return (
    <main className="flex flex-1 flex-col">
      <ContactSection business={SITE_CONFIG.business} />
    </main>
  );
}
