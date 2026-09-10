/**
 * Anti-spam DOM footprint (Phase 0 §P, UX-confirmed by Phase 2A §15) — a
 * honeypot field plus the mount-timestamp value, both entirely invisible
 * and non-focusable to a real user. This component renders no visible UI;
 * it exists so the mechanism has a home distinct from the visible form
 * fields in `ContactForm.tsx`.
 */
export function HoneypotField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden"
    >
      <label htmlFor="company">会社名</label>
      <input
        id="company"
        name="company"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
