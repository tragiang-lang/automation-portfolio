/**
 * Site Report LIFF entry point (Task 8). Stays a Server Component itself
 * — the interactive client boundary is scoped to `SiteReportScreen`
 * alone (LIFF init/browser state), not this whole route.
 */
import { SiteReportScreen } from "@/components/site-report/SiteReportScreen";

export default function Home() {
  return <SiteReportScreen />;
}
