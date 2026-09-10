import type { WizardStep } from "./useReservationWizard";

const STEP_LABELS: Record<WizardStep, string> = {
  service: "メニューを選択",
  staff: "スタッフを選択",
  datetime: "日時を選択",
  customer: "お客様情報を入力",
  review: "予約内容の確認",
};

/** Step-by-step wizard progress indicator (project UI rule: any flow with
 *  more than 3 decision steps must show "ステップ n/N" and a visible
 *  current-step title, never dump every step into one form). */
export function ReservationProgress({ steps, currentStep }: { steps: WizardStep[]; currentStep: WizardStep }) {
  const index = steps.indexOf(currentStep);
  return (
    <div role="status" aria-live="polite" className="mb-8">
      <p className="text-[13px] tracking-[0.02em] text-muted">
        ステップ {index + 1}/{steps.length}
      </p>
      <p className="mt-1 text-[20px] font-medium text-primary">{STEP_LABELS[currentStep]}</p>
    </div>
  );
}
