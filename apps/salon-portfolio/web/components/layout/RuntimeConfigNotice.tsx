/**
 * Calm, non-technical notice shown only when this request's runtime
 * config status is `runtime-error` — a configured GAS backend that
 * failed, as opposed to `demo-fallback` (expected in local/demo mode) or
 * `runtime` (the normal path). Renders nothing in every other case, so it
 * causes zero layout shift on the site's current default state.
 */
export function RuntimeConfigNotice({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div role="status" className="bg-surface-sunken py-2 text-center text-[13px] text-secondary">
      現在、最新の店舗情報を取得できませんでした。表示中の内容が実際と異なる場合がございます。
    </div>
  );
}
