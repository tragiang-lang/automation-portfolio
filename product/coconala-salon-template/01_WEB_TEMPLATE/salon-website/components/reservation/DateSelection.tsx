/** Native date input (spec §10) — deliberately not a custom calendar
 *  widget: no new dependency, full keyboard support and mobile picker UX
 *  come from the browser for free. `min`/`max` are advisory UX bounds only
 *  (derived by the caller from `reservation.minLeadHours`/`maxBookingDays`)
 *  — the backend re-validates the actual date/time on both
 *  `getAvailability` and `createReservation`, so this input is never the
 *  authoritative business-hours/holiday check (Global Constraints). */
export function DateSelection({
  value,
  minDate,
  maxDate,
  onChange,
}: {
  value: string | null;
  minDate: string;
  maxDate: string;
  onChange: (date: string) => void;
}) {
  return (
    <div>
      <label htmlFor="reservation-date" className="mb-2 block text-[14px] font-medium text-primary">
        日付
      </label>
      <input
        id="reservation-date"
        type="date"
        value={value ?? ""}
        min={minDate}
        max={maxDate}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className="min-h-[44px] w-full rounded-sm border border-border bg-surface px-4 py-3 text-[16px] text-primary focus-visible:border-accent"
      />
    </div>
  );
}
