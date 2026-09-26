// Rich Menu image plus CSS-drawn stand-ins for spreadsheet / email screenshots.
// Synthetic data only (see content/hair-salon.ts).
import Image from "next/image";
import { demoEmail, demoReservations, hairSalonCaseStudy } from "@/content/hair-salon";

export function RichMenuImage({ sizes, priority }: { sizes: string; priority?: boolean }) {
  const { image } = hairSalonCaseStudy.richMenu;
  return (
    <Image
      src={image.src}
      width={image.width}
      height={image.height}
      alt={image.alt}
      sizes={sizes}
      priority={priority}
      className="h-auto w-full rounded-lg border border-line"
    />
  );
}

export function SpreadsheetMock({ compact = false }: { compact?: boolean }) {
  // The small thumbnail keeps only 予約日時 / お名前 / ステータス so it never scrolls.
  const keep = (cells: readonly string[]) => (compact ? [cells[0], cells[1], cells[cells.length - 1]] : [...cells]);
  const headers = keep(demoReservations.headers);
  const shownRows = (compact ? demoReservations.rows.slice(0, 3) : demoReservations.rows).map(keep);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-3 py-2">
        <span aria-hidden className="h-3 w-3 rounded-sm bg-accent" />
        <span className="text-xs font-medium">予約一覧（デモ）</span>
      </div>
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left ${compact ? "text-[11px]" : "text-xs sm:text-sm"}`}>
          <thead>
            <tr className="bg-accent-soft">
              {headers.map((h) => (
                <th key={h} className="whitespace-nowrap border-b border-r border-line px-2 py-1.5 font-medium last:border-r-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRows.map((row) => (
              <tr key={row[0] + row[1]}>
                {row.map((cell, i) => (
                  <td key={i} className="whitespace-nowrap border-b border-r border-line px-2 py-1.5 last:border-r-0">
                    {i === row.length - 1 ? (
                      <span className={cell === demoReservations.confirmedStatus ? "font-medium text-accent" : "text-muted"}>{cell}</span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmailMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-surface ${compact ? "text-xs" : "text-sm"}`}>
      <div className="border-b border-line px-4 py-3">
        <p className={`font-bold ${compact ? "text-sm" : "text-base"}`}>{demoEmail.subject}</p>
        {!compact && (
          <div className="mt-2 space-y-0.5 text-xs text-muted">
            <p>From: {demoEmail.from}</p>
            <p>To: {demoEmail.to}</p>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-4 py-3">
        {demoEmail.fields.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="break-all">{value}</dd>
          </div>
        ))}
      </dl>
      {!compact && <p className="border-t border-line px-4 py-3 text-xs text-muted">{demoEmail.footer}</p>}
    </div>
  );
}
