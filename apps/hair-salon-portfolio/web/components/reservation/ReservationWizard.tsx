"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ANY_STAFF } from "@/types/reservation";
import { useReservationWizard } from "./useReservationWizard";
import type { CustomerFields } from "./useReservationWizard";
import { ReservationProgress } from "./ReservationProgress";
import { ServiceSelection } from "./ServiceSelection";
import { StaffSelection } from "./StaffSelection";
import { DateSelection } from "./DateSelection";
import { TimeSlotSelection } from "./TimeSlotSelection";
import { CustomerInfoForm, validateCustomerFields } from "./CustomerInfoForm";
import { ReservationSummary } from "./ReservationSummary";
import { ReservationSuccess } from "./ReservationSuccess";
import { ReservationDemoSuccess } from "./ReservationDemoSuccess";
import { ReservationErrorNotice } from "./ReservationErrorNotice";

/**
 * Top-level reservation wizard (spec §22) — owns no business logic of its
 * own; it renders `useReservationWizard`'s state through each step's
 * dedicated component. `app/reservation/page.tsx` only mounts this when
 * `features.reservation` is on (Global Constraints/spec §19).
 */
export function ReservationWizard({
  minDate,
  maxDate,
  demoMode = false,
  submitEnabled = true,
}: {
  minDate: string;
  maxDate: string;
  /** Explicit reservation demo-mode switch — see `lib/config/reservationDemoMode.ts`. */
  demoMode?: boolean;
  /** Reservation Wizard SUBMIT gate — see `lib/config/reservationDemoMode.ts::isReservationSubmitEnabled`. */
  submitEnabled?: boolean;
}) {
  const wizard = useReservationWizard({ minDate, maxDate, demoMode, submitEnabled });
  const [touched, setTouched] = useState<Partial<Record<keyof CustomerFields, boolean>>>({});

  if (wizard.catalogStatus === "loading") {
    return <p role="status" className="py-16 text-center text-[14px] text-muted">読み込んでいます…</p>;
  }

  if (wizard.catalogStatus === "error") {
    return (
      <ReservationErrorNotice
        message={wizard.catalogError ?? "サーバーエラーが発生しました。"}
        onRetry={wizard.retryCatalog}
      />
    );
  }

  const selectedService = wizard.services.find((service) => service.serviceId === wizard.selectedServiceId) ?? null;
  const selectedStaffName =
    wizard.selectedStaffId === null
      ? null
      : wizard.selectedStaffId === ANY_STAFF
        ? "指名なし（お任せ）"
        : (wizard.staff.find((member) => member.staffId === wizard.selectedStaffId)?.name ?? null);

  if (wizard.submitStatus === "success" && wizard.submitResult) {
    return wizard.submitResult.isDemo ? (
      <ReservationDemoSuccess
        reservationId={wizard.submitResult.reservationId}
        service={selectedService}
        staffName={selectedStaffName}
        date={wizard.selectedDate}
        time={wizard.selectedTime}
        customerName={wizard.customer.name}
      />
    ) : (
      <ReservationSuccess
        reservationId={wizard.submitResult.reservationId}
        needsConfirmation={wizard.submitResult.needsConfirmation}
      />
    );
  }

  const customerErrors = validateCustomerFields(wizard.customer);
  const visibleCustomerErrors = Object.fromEntries(
    Object.entries(customerErrors).filter(([field]) => touched[field as keyof CustomerFields]),
  );

  function canGoNext(): boolean {
    switch (wizard.currentStep) {
      case "service":
        return wizard.selectedServiceId !== null;
      case "datetime":
        return wizard.selectedDate !== null && wizard.selectedTime !== null;
      case "staff":
        return wizard.selectedStaffId !== null;
      case "customer":
        return Object.keys(customerErrors).length === 0;
      default:
        return false;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <ReservationProgress steps={wizard.steps} currentStep={wizard.currentStep} />

      {wizard.submitStatus === "error" && wizard.submitError ? (
        <ReservationErrorNotice message={wizard.submitError} onRetry={wizard.resetAfterError} />
      ) : null}

      {wizard.currentStep === "service" ? (
        <ServiceSelection services={wizard.services} selectedServiceId={wizard.selectedServiceId} onSelect={wizard.selectService} />
      ) : null}

      {wizard.currentStep === "datetime" ? (
        <div className="flex flex-col gap-6">
          <DateSelection value={wizard.selectedDate} minDate={minDate} maxDate={maxDate} onChange={wizard.selectDate} />
          <TimeSlotSelection
            status={wizard.availabilityStatus}
            slots={wizard.availableSlots}
            selectedTime={wizard.selectedTime}
            onSelect={wizard.selectTime}
            onRetry={wizard.retryAvailability}
          />
        </div>
      ) : null}

      {wizard.currentStep === "staff" ? (
        wizard.staffAvailabilityStatus === "loading" ? (
          <p role="status" aria-live="polite" className="text-[14px] text-muted">
            空き状況を確認しています…
          </p>
        ) : wizard.staffAvailabilityStatus === "error" ? (
          <ReservationErrorNotice
            message={wizard.staffAvailabilityError ?? "サーバーエラーが発生しました。"}
            onRetry={wizard.retryStaffAvailability}
          />
        ) : (
          <StaffSelection
            staff={wizard.staff}
            selectedStaffId={wizard.selectedStaffId}
            onSelect={wizard.selectStaff}
            staffAvailability={wizard.staffAvailability}
          />
        )
      ) : null}

      {wizard.currentStep === "customer" ? (
        <CustomerInfoForm
          values={wizard.customer}
          errors={visibleCustomerErrors}
          onChange={wizard.setCustomerField}
          onBlur={(field) => setTouched((prev) => ({ ...prev, [field]: true }))}
        />
      ) : null}

      {wizard.currentStep === "review" && selectedService && wizard.selectedDate && wizard.selectedTime ? (
        <ReservationSummary
          service={selectedService}
          staffName={selectedStaffName}
          date={wizard.selectedDate}
          time={wizard.selectedTime}
          customer={wizard.customer}
          onConfirm={wizard.submit}
          onBack={wizard.goBack}
          confirming={wizard.submitStatus === "submitting"}
          isDemo={wizard.dataSource === "demo"}
        />
      ) : null}

      {wizard.currentStep !== "review" ? (
        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={wizard.goBack} disabled={wizard.steps.indexOf(wizard.currentStep) === 0}>
            戻る
          </Button>
          <Button type="button" onClick={wizard.goNext} disabled={!canGoNext()}>
            次へ
          </Button>
        </div>
      ) : null}
    </div>
  );
}
