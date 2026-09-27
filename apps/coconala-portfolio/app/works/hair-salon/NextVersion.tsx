// Hair Salon only: the "Next Version" proposal layer and the layer markers.
// Everything here is a planned architecture, so it uses dashed borders to stay
// visually distinct from the built demo sections above it.
import { DemoBadge } from "@/components/ui";
import { hairSalonCaseStudy as cs } from "@/content/hair-salon";

type Step = { label: string; systems: readonly string[]; note: string };

const nv = cs.nextVersion;

export function LayerMarker({
  eyebrow,
  title,
  note,
  planned,
}: {
  eyebrow: string;
  title: string;
  note: string;
  planned?: boolean;
}) {
  return (
    <div className={planned ? "border-y-2 border-dashed border-accent bg-accent-soft" : "border-y border-line bg-sunken"}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 sm:px-6">
        <p className="text-xs font-bold tracking-[0.2em] text-accent">{eyebrow}</p>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-muted">{note}</p>
      </div>
    </div>
  );
}

function SystemTag({ name }: { name: string }) {
  return (
    <span className="inline-block rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-muted">
      {name}
    </span>
  );
}

function Arrow() {
  return (
    <span aria-hidden className="text-accent">
      →
    </span>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  return (
    <div className="flex h-full w-full items-start gap-3 rounded-xl border border-dashed border-accent bg-surface p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
        {index + 1}
      </span>
      <div>
        <p className="font-bold leading-snug">{step.label}</p>
        <p className="mt-0.5 text-xs text-muted">{step.note}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {step.systems.map((system) => (
            <SystemTag key={system} name={system} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Vertical step list with down arrows; used for every flow except the wide reservation grid. */
function StepList({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className="flex flex-col items-center gap-1">
      {steps.map((step, i) => (
        <li key={step.label} className="flex w-full flex-col items-center gap-1">
          <StepCard step={step} index={i} />
          {i < steps.length - 1 && (
            <span aria-hidden className="text-accent">
              ↓
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

export function NextVersionSections() {
  return (
    <>
      {/* Overview: the five proposed flows at a glance */}
      <section className="bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <DemoBadge label={nv.badge} />
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">{nv.title}</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{nv.description}</p>

          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {nv.summaries.map((summary) => (
              <li key={summary.label} className="rounded-xl border border-dashed border-accent bg-paper p-4">
                <p className="text-xs font-bold tracking-widest text-accent">{summary.label}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
                  {summary.chain.map((item, i) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      {i > 0 && <Arrow />}
                      <span>{item}</span>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>

          <h3 className="mt-14 text-lg font-bold sm:text-xl">{nv.richMenu.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{nv.richMenu.description}</p>
          {/* Same button order as the current Rich Menu image. */}
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {nv.richMenu.buttons.map((button) => (
              <li key={button.label} className="rounded-xl border border-dashed border-accent bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{button.label}</p>
                  <SystemTag name={button.kind} />
                </div>
                <p className="mt-2 text-sm font-medium">{button.next}</p>
                <p className="mt-1 text-xs text-muted">
                  {nv.richMenu.currentLabel}：{button.current}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Detailed flows with the system each step would run on */}
      <section>
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold sm:text-3xl">{nv.flowsTitle}</h2>

          <h3 className="mt-8 text-lg font-bold sm:text-xl">{nv.reservation.title}</h3>
          <ol className="mt-4 grid gap-y-1 md:grid-cols-4 md:gap-4">
            {nv.reservation.steps.map((step, i) => (
              <li key={step.label} className="flex flex-col items-center">
                <StepCard step={step} index={i} />
                {i < nv.reservation.steps.length - 1 && (
                  <span aria-hidden className="py-1 text-lg leading-none text-accent md:hidden">
                    ↓
                  </span>
                )}
              </li>
            ))}
          </ol>
          <dl className="mt-6 grid gap-3 md:grid-cols-2">
            {nv.reservation.dataRoles.map((item) => (
              <div key={item.system} className="rounded-xl border border-line bg-surface p-4">
                <dt>
                  <SystemTag name={item.system} />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed">{item.role}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">{nv.reservation.note}</p>

          <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-8">
            {nv.otherFlows.map((flow) => (
              <div key={flow.title}>
                <h3 className="mb-4 text-lg font-bold sm:text-xl">{flow.title}</h3>
                <StepList steps={flow.steps} />
                <p className="mt-4 text-sm leading-relaxed text-muted">{flow.note}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-14 text-lg font-bold sm:text-xl">{nv.technology.title}</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {nv.technology.items.map((item) => (
              <li key={item} className="rounded-full border border-dashed border-accent bg-surface px-4 py-2 text-sm">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted">{nv.disclaimer}</p>
        </div>
      </section>
    </>
  );
}
