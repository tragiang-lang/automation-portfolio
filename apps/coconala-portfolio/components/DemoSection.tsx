import { siteContent } from "@/content/site";
import { EmailMock, RichMenuImage, SpreadsheetMock } from "./DemoVisuals";
import { DemoBadge, Section, SectionHeading } from "./ui";

const shotVisual = {
  richMenu: <RichMenuImage sizes="(min-width: 768px) 320px, 100vw" />,
  spreadsheet: <SpreadsheetMock compact />,
  email: <EmailMock compact />,
};

export function DemoSection() {
  const { demo } = siteContent;
  return (
    <Section id="demo" tone="surface">
      <div className="flex flex-wrap items-start justify-between gap-x-4">
        <SectionHeading eyebrow={demo.eyebrow} title={demo.title} />
        <div className="mb-8">
          <DemoBadge label={demo.badge} />
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-line bg-sunken">
        {demo.videoSrc ? (
          <video
            src={demo.videoSrc}
            poster={demo.videoPoster}
            controls
            muted
            playsInline
            preload="metadata"
            className="aspect-video h-auto w-full object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <span aria-hidden className="text-3xl text-muted">
              ▶
            </span>
            <p className="text-sm font-medium text-muted">{demo.videoPlaceholder}</p>
            <p className="text-xs text-muted">下の画面サンプルで流れをご覧ください</p>
          </div>
        )}
      </div>

      <ul className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
        {demo.shots.map((shot) => (
          <li key={shot.kind} className="flex flex-col">
            <div className="flex flex-1 items-center">
              <div className="w-full">{shotVisual[shot.kind]}</div>
            </div>
            <p className="mt-3 text-sm text-muted">{shot.caption}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-xs leading-relaxed text-muted">{demo.note}</p>
    </Section>
  );
}
