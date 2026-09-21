"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvailability, getServices, getStaff, submitReservation } from "@/lib/api/reservationClient";
import { getDemoPublicServices, getDemoPublicStaff } from "@/lib/config/reservationDemoCatalog";
import { getDemoAvailability, getDemoStaffAvailability } from "@/lib/config/demoAvailability";
import { submitDemoReservation } from "@/lib/config/reservationDemoSubmission";
import { generateSubmissionId } from "@/lib/utils/id";
import {
  ANY_STAFF,
  AvailableTimeSlot,
  PublicService,
  PublicStaff,
  ReservationSubmissionSuccess,
  StaffAvailabilityEntry,
} from "@/types/reservation";

/** Whether the wizard's catalog/availability came from the explicit demo
 *  switch (`lib/config/reservationDemoMode.ts`) or a real GAS response.
 *  Deliberately just this one flag (spec: "the Review screen only needs to
 *  know whether the reservation is operating in demo mode") — not a
 *  generic per-field data-source framework. Submission has its own,
 *  independent gate (`submitEnabled` below / `ReservationSubmissionSuccess.isDemo`)
 *  so a review screen showing demo catalog data can never be mistaken for a
 *  guarantee that submit is also safe — that guarantee only comes from
 *  `submitEnabled`. */
export type ReservationDataSource = "runtime" | "demo";

export type WizardStep = "service" | "datetime" | "staff" | "customer" | "review";

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
   *  switch's data, "runtime" for the normal real-GAS path. Independent of
   *  whether `submit` reaches real GAS — see `submitEnabled`. */
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

  /** Per-staff availability + conflict breakdown for the exact chosen
   *  date+time+service candidate (staff-conflict display) — loads once all
   *  three are chosen, on the "staff" step which now comes after
   *  "datetime". Empty/idle whenever staff selection is off. */
  staffAvailabilityStatus: "idle" | "loading" | "ready" | "error";
  staffAvailabilityError: string | null;
  staffAvailability: StaffAvailabilityEntry[];

  submitStatus: "idle" | "submitting" | "success" | "error";
  submitError: string | null;
  submitResult: ReservationSubmissionSuccess | null;

  retryCatalog: () => void;
  selectService: (serviceId: string) => void;
  selectStaff: (staffId: string | typeof ANY_STAFF) => void;
  selectDate: (date: string) => void;
  selectTime: (time: string) => void;
  retryAvailability: () => void;
  retryStaffAvailability: () => void;
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
   *  `false` (existing real-GAS behavior, unchanged) when omitted. Governs
   *  catalog/availability only — see `submitEnabled` for `submit`. */
  demoMode?: boolean;
  /** Reservation Wizard SUBMIT gate (`lib/config/reservationDemoMode.ts::isReservationSubmitEnabled`),
   *  resolved server-side by the caller the same way as `demoMode`.
   *  Defaults to `true` (existing real-GAS behavior, unchanged) when
   *  omitted — callers that need the safe default (a real deployment)
   *  always pass this explicitly from the env-var gate, which itself
   *  defaults to `false`. When `false`, `submit()` calls
   *  `lib/config/reservationDemoSubmission.ts::submitDemoReservation`
   *  instead of `lib/api/reservationClient.ts::submitReservation` — this
   *  never depends on `demoMode`, so it stays safe even if `GAS_WEBAPP_URL`
   *  is also configured. */
  submitEnabled?: boolean;
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
export function useReservationWizard({
  demoMode = false,
  submitEnabled = true,
}: UseReservationWizardConfig): ReservationWizardState {
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

  const [staffAvailabilityStatus, setStaffAvailabilityStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [staffAvailabilityError, setStaffAvailabilityError] = useState<string | null>(null);
  const [staffAvailability, setStaffAvailability] = useState<StaffAvailabilityEntry[]>([]);
  const [staffAvailabilityReloadToken, setStaffAvailabilityReloadToken] = useState(0);

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
        ? ["service", "datetime", "staff", "customer", "review"]
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

  // Availability load whenever service/date are chosen (or date changes) —
  // cleared and reloaded per spec §12, never left stale. Staff is chosen
  // AFTER date/time now (steps: service -> datetime -> staff -> ...), so
  // this always resolves "is at least one staff free" (ANY_STAFF) rather
  // than a specific staff's own availability — the per-staff breakdown for
  // the eventually-chosen candidate is the separate effect below.
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
    const staffId = staffSelectionEnabled ? ANY_STAFF : undefined;
    if (demoMode) {
      // Explicit demo mode: never calls getAvailability — no real Google
      // Calendar dependency, no GAS failure mode applies here.
      startTransition(() => {
        setAvailableSlots(getDemoAvailability({ serviceId: selectedServiceId, staffId, date: selectedDate }));
        setAvailabilityStatus("ready");
      });
      return;
    }
    (async () => {
      const result = await getAvailability({ serviceId: selectedServiceId, staffId, date: selectedDate });
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
  }, [selectedServiceId, selectedDate, staffSelectionEnabled, availabilityReloadToken, demoMode]);

  // Per-staff availability + conflict breakdown for the exact candidate
  // (staff-conflict display) — loads once service+date+time are all
  // chosen, i.e. right when the customer reaches the "staff" step, and
  // reloads whenever any of those change or a submit conflict forces a
  // refresh (staffAvailabilityReloadToken).
  useEffect(() => {
    if (!staffSelectionEnabled || !selectedServiceId || !selectedDate || !selectedTime) {
      startTransition(() => {
        setStaffAvailabilityStatus("idle");
        setStaffAvailability([]);
      });
      return;
    }
    let cancelled = false;
    startTransition(() => {
      setStaffAvailabilityStatus("loading");
      setStaffAvailabilityError(null);
    });
    if (demoMode) {
      startTransition(() => {
        setStaffAvailability(
          getDemoStaffAvailability({ serviceId: selectedServiceId, date: selectedDate, time: selectedTime }),
        );
        setStaffAvailabilityStatus("ready");
      });
      return;
    }
    (async () => {
      const result = await getAvailability({
        serviceId: selectedServiceId,
        staffId: ANY_STAFF,
        date: selectedDate,
        time: selectedTime,
      });
      if (cancelled) return;
      if (!result.ok) {
        setStaffAvailabilityStatus("error");
        setStaffAvailabilityError(result.error.message);
        return;
      }
      setStaffAvailability(result.data.staff ?? []);
      setStaffAvailabilityStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
    // staffAvailabilityReloadToken is a deliberate manual/error-recovery
    // retry trigger, not a data dependency the effect body reads.
  }, [staffSelectionEnabled, selectedServiceId, selectedDate, selectedTime, staffAvailabilityReloadToken, demoMode]);

  const retryCatalog = useCallback(() => setCatalogReloadToken((n) => n + 1), []);
  const retryAvailability = useCallback(() => setAvailabilityReloadToken((n) => n + 1), []);
  const retryStaffAvailability = useCallback(() => setStaffAvailabilityReloadToken((n) => n + 1), []);

  // Service/date changes invalidate everything chosen downstream of them
  // (time, staff): both were only checked against the old selection.
  const selectService = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId);
    setSelectedTime(null);
    setSelectedStaffId(null);
    submissionIdRef.current = null;
  }, []);

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setSelectedStaffId(null);
    submissionIdRef.current = null;
  }, []);

  // A (re-)selected time invalidates any staff pick made for the previous
  // time — staff is chosen after datetime now, so this is the boundary
  // that resets it.
  const selectTime = useCallback((time: string) => {
    setSelectedTime(time);
    setSelectedStaffId(null);
    submissionIdRef.current = null;
  }, []);

  // Staff comes last before customer info — picking a different staff at
  // the same already-chosen date/time doesn't invalidate anything else.
  const selectStaff = useCallback((staffId: string | typeof ANY_STAFF) => {
    setSelectedStaffId(staffId);
    submissionIdRef.current = null;
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
      const payload = {
        submissionId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId ?? undefined,
        date: selectedDate,
        time: selectedTime,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        notes: customer.notes || undefined,
      };
      // The one branch point for the whole submit path (spec: "the safety
      // check must happen in application logic, not only through UI
      // state") — `submitDemoReservation` imports nothing that can reach
      // `/api/gas`/GAS, so this stays safe even if `GAS_WEBAPP_URL` is
      // configured in the same deployment as `submitEnabled=false`.
      const result = submitEnabled ? await submitReservation(payload) : await submitDemoReservation(payload);
      if (result.ok) {
        setSubmitStatus("success");
        setSubmitResult(result.data);
      } else {
        setSubmitStatus("error");
        setSubmitError(result.error.message);
        // The final, authoritative lock-protected check found a conflict
        // that slipped past the advisory checks the customer already saw
        // (spec §14) — stop, keep the date/time, drop the stale staff pick
        // so they must choose an actually-available one, and force a
        // fresh staff-availability fetch instead of trusting the one that
        // was already wrong.
        if (result.error.code === "SLOT_UNAVAILABLE") {
          submissionIdRef.current = null;
          if (staffSelectionEnabled) {
            setSelectedStaffId(null);
            setCurrentStep("staff");
            setStaffAvailabilityReloadToken((n) => n + 1);
          } else {
            setCurrentStep("datetime");
            setAvailabilityReloadToken((n) => n + 1);
          }
        }
      }
    } finally {
      submittingRef.current = false;
    }
  }, [selectedServiceId, selectedStaffId, selectedDate, selectedTime, customer, submitEnabled, staffSelectionEnabled]);

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
    staffAvailabilityStatus,
    staffAvailabilityError,
    staffAvailability,
    submitStatus,
    submitError,
    submitResult,
    retryCatalog,
    selectService,
    selectStaff,
    selectDate,
    selectTime,
    retryAvailability,
    retryStaffAvailability,
    setCustomerField,
    goToStep,
    goBack,
    goNext,
    submit,
    resetAfterError,
  };
}
