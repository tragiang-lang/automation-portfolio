"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvailability, getServices, getStaff, submitReservation } from "@/lib/api/reservationClient";
import { getDemoPublicServices, getDemoPublicStaff } from "@/lib/config/reservationDemoCatalog";
import { getDemoAvailability } from "@/lib/config/demoAvailability";
import { generateSubmissionId } from "@/lib/utils/id";
import { ANY_STAFF, AvailableTimeSlot, PublicService, PublicStaff, ReservationSubmissionSuccess } from "@/types/reservation";

/** Whether the wizard's catalog/availability came from the explicit demo
 *  switch (`lib/config/reservationDemoMode.ts`) or a real GAS response.
 *  Deliberately just this one flag (spec: "the Review screen only needs to
 *  know whether the reservation is operating in demo mode") — not a
 *  generic per-field data-source framework. Submission is never sourced
 *  from either; it always calls real GAS regardless of this value. */
export type ReservationDataSource = "runtime" | "demo";

export type WizardStep = "service" | "staff" | "datetime" | "customer" | "review";

export interface CustomerFields {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

const EMPTY_CUSTOMER: CustomerFields = { name: "", email: "", phone: "", notes: "" };

export interface ReservationWizardState {
  catalogStatus: "loading" | "ready" | "error";
  catalogError: string | null;
  services: PublicService[];
  staff: PublicStaff[];
  staffSelectionEnabled: boolean;
  anyStaffOptionEnabled: boolean;
  /** "demo" when this wizard's catalog/availability are the explicit demo
   *  switch's data, "runtime" for the normal real-GAS path. Never affects
   *  `submit` — that always calls real GAS regardless. */
  dataSource: ReservationDataSource;

  steps: WizardStep[];
  currentStep: WizardStep;

  selectedServiceId: string | null;
  selectedStaffId: string | typeof ANY_STAFF | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customer: CustomerFields;

  availabilityStatus: "idle" | "loading" | "ready" | "error";
  availabilityError: string | null;
  availableSlots: AvailableTimeSlot[];

  submitStatus: "idle" | "submitting" | "success" | "error";
  submitError: string | null;
  submitResult: ReservationSubmissionSuccess | null;

  retryCatalog: () => void;
  selectService: (serviceId: string) => void;
  selectStaff: (staffId: string | typeof ANY_STAFF) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  retryAvailability: () => void;
  setCustomerField: (field: keyof CustomerFields, value: string) => void;
  goToStep: (step: WizardStep) => void;
  goBack: () => void;
  goNext: () => void;
  submit: () => Promise<void>;
  resetAfterError: () => void;
}

export interface UseReservationWizardConfig {
  /** "YYYY-MM-DD" — earliest selectable date, already derived by the
   *  caller from `reservation.minLeadHours` (advisory only; the backend
   *  re-validates on both `getAvailability` and `createReservation`). */
  minDate: string;
  /** "YYYY-MM-DD" — latest selectable date, derived from
   *  `reservation.maxBookingDays`. */
  maxDate: string;
  /** Explicit reservation demo-mode switch (`lib/config/reservationDemoMode.ts`),
   *  resolved server-side by the caller (`app/reservation/page.tsx`) and
   *  passed down the same way `minDate`/`maxDate` already are. Defaults to
   *  `false` (existing real-GAS behavior, unchanged) when omitted. Never
   *  bypasses `submit` — see `ReservationDataSource`. */
  demoMode?: boolean;
}

/**
 * All reservation wizard state in one hook (Phase 5) — plain React state,
 * no external state library (spec §23). Every network call goes through
 * `lib/api/reservationClient.ts`; this hook never talks to `/api/gas`
 * directly and never re-implements business-hours/holiday/availability
 * rules — it only orchestrates calls to the existing public actions and
 * tracks UI state around them. `config.minDate`/`config.maxDate` are
 * accepted here purely so callers can construct the whole config object
 * once and pass it to both this hook and `DateSelection`; the hook itself
 * does not validate against them.
 */
export function useReservationWizard({ demoMode = false }: UseReservationWizardConfig): ReservationWizardState {
  const dataSource: ReservationDataSource = demoMode ? "demo" : "runtime";
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "ready" | "error">("loading");
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | typeof ANY_STAFF | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerFields>(EMPTY_CUSTOMER);
  const [currentStep, setCurrentStep] = useState<WizardStep>("service");

  const [availabilityStatus, setAvailabilityStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableTimeSlot[]>([]);
  const [availabilityReloadToken, setAvailabilityReloadToken] = useState(0);

  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<ReservationSubmissionSuccess | null>(null);

  const submissionIdRef = useRef<string | null>(null);
  const submittingRef = useRef(false);

  const staffSelectionEnabled = staff.length > 0;
  // getStaff already returns [] when features.staffSelection is off; the
  // ANY_STAFF option is offered whenever there is anyone to be "any" of —
  // config.staffAnyAvailableOption is still enforced server-side by
  // resolveStaffSelection/getAvailabilityAction/createReservation.
  const anyStaffOptionEnabled = staffSelectionEnabled;

  const steps = useMemo<WizardStep[]>(
    () =>
      staffSelectionEnabled
        ? ["service", "staff", "datetime", "customer", "review"]
        : ["service", "datetime", "customer", "review"],
    [staffSelectionEnabled],
  );

  // Catalog load (+ retry).
  useEffect(() => {
    let cancelled = false;
    // `startTransition` (not a direct call) — React's own sanctioned way
    // to reset state from an Effect without triggering a synchronous
    // cascading re-render (react-hooks/set-state-in-effect); the initial
    // "loading" value the first mount needs is already covered by
    // `useState`'s own default, this only matters for a retry.
    startTransition(() => {
      setCatalogStatus("loading");
      setCatalogError(null);
    });
    if (demoMode) {
      // Explicit demo mode: never calls getServices/getStaff — no GAS
      // failure mode applies here at all (see ReservationDataSource).
      startTransition(() => {
        setServices(getDemoPublicServices());
        setStaff(getDemoPublicStaff());
        setCatalogStatus("ready");
      });
      return;
    }
    (async () => {
      const [servicesResult, staffResult] = await Promise.all([getServices(), getStaff()]);
      if (cancelled) return;
      if (!servicesResult.ok) {
        setCatalogStatus("error");
        setCatalogError(servicesResult.error.message);
        return;
      }
      if (!staffResult.ok) {
        setCatalogStatus("error");
        setCatalogError(staffResult.error.message);
        return;
      }
      setServices(servicesResult.data);
      setStaff(staffResult.data);
      setCatalogStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogReloadToken, demoMode]);

  // Availability load whenever service/staff/date are all chosen (or date
  // changes) — cleared and reloaded per spec §12, never left stale.
  useEffect(() => {
    if (!selectedServiceId || !selectedDate) {
      startTransition(() => {
        setAvailabilityStatus("idle");
        setAvailableSlots([]);
      });
      return;
    }
    let cancelled = false;
    startTransition(() => {
      setAvailabilityStatus("loading");
      setAvailabilityError(null);
    });
    if (demoMode) {
      // Explicit demo mode: never calls getAvailability — no real Google
      // Calendar dependency, no GAS failure mode applies here.
      startTransition(() => {
        setAvailableSlots(
          getDemoAvailability({ serviceId: selectedServiceId, staffId: selectedStaffId ?? undefined, date: selectedDate }),
        );
        setAvailabilityStatus("ready");
      });
      return;
    }
    (async () => {
      const result = await getAvailability({
        serviceId: selectedServiceId,
        staffId: selectedStaffId ?? undefined,
        date: selectedDate,
      });
      if (cancelled) return;
      if (!result.ok) {
        setAvailabilityStatus("error");
        setAvailabilityError(result.error.message);
        return;
      }
      setAvailableSlots(result.data.slots);
      setAvailabilityStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
    // availabilityReloadToken is a deliberate manual-retry trigger, not a
    // data dependency the effect body reads — extra (unread) deps don't
    // trigger react-hooks/exhaustive-deps, so no disable comment is needed.
  }, [selectedServiceId, selectedStaffId, selectedDate, availabilityReloadToken, demoMode]);

  const retryCatalog = useCallback(() => setCatalogReloadToken((n) => n + 1), []);
  const retryAvailability = useCallback(() => setAvailabilityReloadToken((n) => n + 1), []);

  const clearSelectedTimeAndSubmissionId = useCallback(() => {
    setSelectedTime(null);
    submissionIdRef.current = null;
  }, []);

  const selectService = useCallback(
    (serviceId: string) => {
      setSelectedServiceId(serviceId);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectStaff = useCallback(
    (staffId: string | typeof ANY_STAFF) => {
      setSelectedStaffId(staffId);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectDate = useCallback(
    (date: string) => {
      setSelectedDate(date);
      clearSelectedTimeAndSubmissionId();
    },
    [clearSelectedTimeAndSubmissionId],
  );

  const selectTime = useCallback((time: string) => {
    setSelectedTime(time);
    submissionIdRef.current = null; // a (re-)selected time always represents a fresh attempt
  }, []);

  const setCustomerField = useCallback((field: keyof CustomerFields, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => setCurrentStep(step), []);
  const goBack = useCallback(() => {
    setCurrentStep((step) => {
      const index = steps.indexOf(step);
      return index > 0 ? steps[index - 1] : step;
    });
  }, [steps]);
  const goNext = useCallback(() => {
    setCurrentStep((step) => {
      const index = steps.indexOf(step);
      return index >= 0 && index < steps.length - 1 ? steps[index + 1] : step;
    });
  }, [steps]);

  const resetAfterError = useCallback(() => {
    setSubmitStatus("idle");
    setSubmitError(null);
  }, []);

  const submit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!selectedServiceId || !selectedDate || !selectedTime) return;
    submittingRef.current = true;
    setSubmitStatus("submitting");
    setSubmitError(null);
    try {
      const submissionId = submissionIdRef.current ?? generateSubmissionId();
      submissionIdRef.current = submissionId;
      const result = await submitReservation({
        submissionId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId ?? undefined,
        date: selectedDate,
        time: selectedTime,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        notes: customer.notes || undefined,
      });
      if (result.ok) {
        setSubmitStatus("success");
        setSubmitResult(result.data);
      } else {
        setSubmitStatus("error");
        setSubmitError(result.error.message);
      }
    } finally {
      submittingRef.current = false;
    }
  }, [selectedServiceId, selectedStaffId, selectedDate, selectedTime, customer]);

  return {
    catalogStatus,
    catalogError,
    services,
    staff,
    staffSelectionEnabled,
    anyStaffOptionEnabled,
    dataSource,
    steps,
    currentStep,
    selectedServiceId,
    selectedStaffId,
    selectedDate,
    selectedTime,
    customer,
    availabilityStatus,
    availabilityError,
    availableSlots,
    submitStatus,
    submitError,
    submitResult,
    retryCatalog,
    selectService,
    selectStaff,
    selectDate,
    selectTime,
    retryAvailability,
    setCustomerField,
    goToStep,
    goBack,
    goNext,
    submit,
    resetAfterError,
  };
}
