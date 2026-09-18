import { ApiRequest, ApiResponse } from "./models/Api";
import { ERROR_CODES, ErrorCode } from "./models/ErrorCodes";
import { ConfigError, getConfig } from "./ConfigStore";
import { buildPublicConfig } from "./PublicConfig";
import { AppConfig, PublicConfig } from "./models/Config";
import { MissingHeadersError } from "./RowMapper";
import { NormalizedReservation, StaffSelectionResolution } from "./models/ReservationDomain";
import { ANY_STAFF, ReservationRequest } from "./models/ReservationRequest";
import { StaffRow } from "./SheetSchemas";
import { SlotCandidate } from "./SlotEngine";
import { AvailabilityResult, AvailabilityStrategy, BusyInterval } from "./availability/AvailabilityStrategy";
import {
  resolveCalendarIdForStaff,
  resolveCalendarIdsForSelection,
  buildAvailabilityStrategyFromBusyByCalendarId,
} from "./availability/ReservationAvailabilityFactory";
import { evaluateAvailableSlots, evaluateReservationRequest } from "./ReservationRules";
import { getServiceRows, getStaffRows } from "./Catalog";
import { mapReservationIssueToErrorResponse } from "./ReservationErrorMapping";
import { PublicService, PublicStaff } from "./models/Catalog";
import { buildPublicServices, buildPublicStaff } from "./PublicCatalog";
import {
  appendReservationRow,
  buildPendingReservationRow,
  findReservationBySubmissionId,
  markReservationConfirmed,
  markReservationNeedsConfirmation,
  updateReservationEmailStatus,
} from "./ReservationRepository";
import { generateCancellationToken } from "./ids/CancellationToken";
import {
  getCachedReservationResult,
  setCachedReservationResult,
  mapReservationRowToResult,
  IdempotencyResult,
} from "./Idempotency";
import { getBusyEvents, createReservationEvent } from "./Calendar";
import { sendEmail } from "./Mail";
import { getSiteBaseUrl } from "./RuntimeProperties";
import { logError, logEmail } from "./Logging";
import {
  buildCustomerConfirmationEmail,
  buildOwnerConfirmedNotificationEmail,
  buildOwnerNeedsAttentionEmail,
  ReservationEmailContext,
} from "./ReservationEmailTemplates";
import { tokyoCalendarDayRange, toTokyoLocalDateTimeString } from "./Utils";
import { InquiryRequest } from "./models/InquiryRequest";
import { normalizeInquiryRequest, validateInquiryRequestShape } from "./InquiryValidation";
import { generateInquiryId } from "./ids/InquiryId";
import { appendInquiryRow, buildPendingInquiryRow, findInquiryBySubmissionId } from "./InquiryRepository";
import {
  getCachedInquiryResult,
  setCachedInquiryResult,
  mapInquiryRowToResult,
  InquiryIdempotencyResult,
} from "./InquiryIdempotency";
import {
  buildCustomerInquiryConfirmationEmail,
  buildOwnerInquiryNotificationEmail,
  InquiryEmailContext,
} from "./InquiryEmailTemplates";

/** Parses and shape-checks the raw POST body. Pure — never touches GAS
 *  globals — so the dispatch logic is Jest-testable independent of
 *  Sheets access (Decision 3: no DI seam manufactured — this is a plain
 *  function over a plain string, not an injected interface). */
export function parseApiRequest(
  rawBody: string | undefined,
): { ok: true; request: ApiRequest } | { ok: false; message: string } {
  if (!rawBody || rawBody.trim().length === 0) {
    return { ok: false, message: "Request body is empty." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return { ok: false, message: "Request body is not valid JSON." };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as { action?: unknown }).action !== "string" ||
    (parsed as { action: string }).action.trim().length === 0
  ) {
    return {
      ok: false,
      message: 'Request body must include a non-empty "action" field.',
    };
  }
  return { ok: true, request: parsed as ApiRequest };
}

export function buildSuccessResponse<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function buildErrorResponse(
  code: ErrorCode,
  message: string,
): ApiResponse<never> {
  return { ok: false, error: { code, message } };
}

/** Maps a caught ConfigError to the stable public error contract — never
 *  forwards `issues` (server-side diagnostic detail only) to the caller
 *  (Phase 3A §9). The issues are logged to the execution transcript
 *  (Phase 0 §O layer 1) for the developer to inspect manually; ERROR_LOG
 *  sheet persistence is Phase 3B+ (Phase 3A §34: establish the schema,
 *  don't wire every function into it yet). */
export function mapConfigErrorToResponse(
  error: ConfigError,
): ApiResponse<never> {
  console.error("[getConfig] CONFIG_INVALID:", JSON.stringify(error.issues));
  return buildErrorResponse(
    ERROR_CODES.CONFIG_INVALID,
    "設定情報の読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** Maps a caught MissingHeadersError (RowMapper.ts — a required sheet
 *  column is missing/renamed) to the stable public error contract — an
 *  operator-fixable condition distinct from CONFIG_INVALID/INTERNAL_ERROR,
 *  which is exactly what SHEET_ERROR exists to represent. The specific
 *  missing header names are logged server-side only (console.error) and
 *  never included in the client-facing message (Phase 3A §9, mirroring
 *  mapConfigErrorToResponse above). */
export function mapMissingHeadersErrorToResponse(
  error: MissingHeadersError,
): ApiResponse<never> {
  console.error("[getConfig] SHEET_ERROR: missing headers:", error.missing.join(", "));
  return buildErrorResponse(
    ERROR_CODES.SHEET_ERROR,
    "スプレッドシートの読み込みに失敗しました。管理者にお問い合わせください。",
  );
}

/** `getConfig` action handler (Phase 0 §G/§H, Phase 3A §19). Thin: reads
 *  real CONFIG/HOLIDAYS sheets via ConfigStore, maps to the public
 *  projection, and translates a ConfigError into the stable error
 *  envelope. Not unit tested directly (it touches SpreadsheetApp through
 *  ConfigStore.getConfig) — ConfigStore's own parsing/validation logic
 *  and mapConfigErrorToResponse above carry the tested behavior. */
export function getConfigAction(): ApiResponse<PublicConfig> {
  try {
    const config = getConfig();
    return buildSuccessResponse(buildPublicConfig(config));
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[getConfig] unexpected error:", error);
    return buildErrorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      "サーバーエラーが発生しました。",
    );
  }
}

function getServicesActionInner(): ApiResponse<PublicService[]> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  return buildSuccessResponse(buildPublicServices(getServiceRows()));
}

/** `getServices` action handler (Phase 5). Thin, same
 *  ConfigError/MissingHeadersError mapping as `getConfigAction` —
 *  read-only, never writes anything. */
export function getServicesAction(): ApiResponse<PublicService[]> {
  try {
    return getServicesActionInner();
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getServices] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

function getStaffActionInner(): ApiResponse<PublicStaff[]> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  // Phase 0 §K: no staff dimension at all when the feature is off — an
  // empty list, not an error, matches ReservationRules.resolveStaffSelection's
  // own "none" (not-an-error) treatment of this same flag.
  if (!config.features.staffSelection) {
    return buildSuccessResponse([]);
  }
  return buildSuccessResponse(buildPublicStaff(getStaffRows()));
}

/** `getStaff` action handler (Phase 5). See `getServicesAction` above. */
export function getStaffAction(): ApiResponse<PublicStaff[]> {
  try {
    return getStaffActionInner();
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getStaff] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

/** Single POST entrypoint's dispatch logic (Phase 0 §G: "all actions
 *  share one endpoint, routed by an `action` field"). Only `getConfig`
 *  is implemented in Phase 3A (§2 scope rule) — every other action name
 *  is rejected as a validation error; there is nothing else to route to
 *  yet (getServices/getStaff/createReservation/etc. are Phase 3B+). */
export function handleApiRequest(rawBody: string | undefined): ApiResponse {
  const parsed = parseApiRequest(rawBody);
  if (!parsed.ok) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, parsed.message);
  }
  switch (parsed.request.action) {
    case "getConfig":
      return getConfigAction();
    case "getServices":
      return getServicesAction();
    case "getStaff":
      return getStaffAction();
    case "createReservation":
      return createReservationAction(parsed.request.payload);
    case "getAvailability":
      return getAvailabilityAction(parsed.request.payload);
    case "createInquiry":
      return createInquiryAction(parsed.request.payload);
    default:
      return buildErrorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        `Unsupported action: "${parsed.request.action}".`,
      );
  }
}

const CRITICAL_SECTION_LOCK_TIMEOUT_MS = 10_000;
const IDEMPOTENCY_CLAIM_LOCK_TIMEOUT_MS = 5_000;

export class SystemBusyError extends Error {
  constructor() {
    super("Lock acquisition timed out.");
    this.name = "SystemBusyError";
  }
}

function buildAvailabilityFor(fallbackCalendarId: string) {
  return (candidate: SlotCandidate, staffSelection: StaffSelectionResolution): AvailabilityStrategy => {
    const calendarIds = [...new Set(resolveCalendarIdsForSelection(staffSelection, fallbackCalendarId))];
    const { start, end } = tokyoCalendarDayRange(candidate.date);
    const busyByCalendarId: Record<string, BusyInterval[]> = {};
    for (const calendarId of calendarIds) {
      busyByCalendarId[calendarId] = getBusyEvents(calendarId, start, end);
    }
    return buildAvailabilityStrategyFromBusyByCalendarId(staffSelection, fallbackCalendarId, busyByCalendarId);
  };
}

/** Phase 5's `getAvailability` counterpart to `buildAvailabilityFor` above
 *  — keyed by date only (no per-candidate call), so it fetches busy events
 *  exactly once per request (one `getBusyEvents` call per distinct
 *  calendar id the resolved staff selection needs) instead of once per
 *  candidate slot in the day. Left as a separate function rather than
 *  reusing `buildAvailabilityFor` because the two have different call
 *  shapes: `createReservation`'s call sites always check one specific
 *  candidate, `getAvailability` checks every candidate in a day. */
function buildAvailabilityForDate(fallbackCalendarId: string, date: string) {
  return (staffSelection: StaffSelectionResolution): AvailabilityStrategy => {
    const calendarIds = [...new Set(resolveCalendarIdsForSelection(staffSelection, fallbackCalendarId))];
    const { start, end } = tokyoCalendarDayRange(date);
    const busyByCalendarId: Record<string, BusyInterval[]> = {};
    for (const calendarId of calendarIds) {
      busyByCalendarId[calendarId] = getBusyEvents(calendarId, start, end);
    }
    return buildAvailabilityStrategyFromBusyByCalendarId(staffSelection, fallbackCalendarId, busyByCalendarId);
  };
}

export interface GetAvailabilityResponseData {
  date: string;
  slots: { time: string }[];
}

function getAvailabilityActionInner(rawPayload: unknown): ApiResponse<GetAvailabilityResponseData> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  if (!rawPayload || typeof rawPayload !== "object") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }
  const payload = rawPayload as { serviceId?: unknown; staffId?: unknown; date?: unknown };
  if (typeof payload.serviceId !== "string" || typeof payload.date !== "string") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }
  const staffId = typeof payload.staffId === "string" ? (payload.staffId as string | typeof ANY_STAFF) : undefined;

  const services = getServiceRows();
  const staff = config.features.staffSelection ? getStaffRows() : [];

  const evaluation = evaluateAvailableSlots({
    serviceId: payload.serviceId,
    staffId,
    date: payload.date,
    services,
    staff,
    config,
    now: new Date(),
    buildStrategy: buildAvailabilityForDate(config.calendarId, payload.date),
  });
  if (!evaluation.ok) {
    const { code, message } = mapReservationIssueToErrorResponse(evaluation.issue);
    return buildErrorResponse(code, message);
  }

  return buildSuccessResponse({ date: payload.date, slots: evaluation.slots });
}

/** `getAvailability` action handler (Phase 5) — read-only, advisory (spec
 *  Principle 2: never a reservation guarantee). Reuses
 *  `evaluateAvailableSlots` (ReservationRules.ts) and the same
 *  `availability/` factory `createReservation` uses; touches Calendar
 *  exactly once per request (one `getBusyEvents` call per distinct
 *  calendar id needed for the resolved staff selection), not once per
 *  candidate slot. */
export function getAvailabilityAction(rawPayload: unknown): ApiResponse<GetAvailabilityResponseData> {
  try {
    return getAvailabilityActionInner(rawPayload);
  } catch (error) {
    if (error instanceof ConfigError) return mapConfigErrorToResponse(error);
    if (error instanceof MissingHeadersError) return mapMissingHeadersErrorToResponse(error);
    console.error("[getAvailability] unexpected error:", error);
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

export type CriticalSectionResult =
  | { kind: "confirmed"; calendarEventId: string }
  | { kind: "needsConfirmationLostRace" }
  | { kind: "needsConfirmationCalendarFailure"; reason: string }
  | { kind: "sheetUpdateFailedAfterCalendar"; calendarEventId: string; cause: unknown }
  | { kind: "unexpectedError"; cause: unknown };

/** Everything inside the main lock (Phase 0 §U steps 5-7): re-check
 *  availability -> create Calendar event -> update the Sheet row to its
 *  final state. Narrows the re-check to the single staff already
 *  advisory-picked by the pre-lock `evaluateReservationRequest` call
 *  (`reservation.assignedStaffId`) rather than re-running the full
 *  ANY_STAFF "first free" search a second time here — re-implementing
 *  that search outside `ReservationRules.ts` would duplicate Phase 3C
 *  logic. Trade-off: if that one advisory-picked staff became busy in the
 *  brief pre-lock-to-lock gap while a *different* eligible staff is still
 *  free, this rejects as SLOT_UNAVAILABLE rather than reassigning —
 *  documented in docs/reservation-transaction-architecture.md's Known
 *  Limitations. */
export function runReservationCriticalSection(
  reservation: NormalizedReservation,
  config: AppConfig,
  staff: StaffRow[],
): CriticalSectionResult {
  const assignedStaff = reservation.assignedStaffId
    ? staff.find((member) => member.StaffID === reservation.assignedStaffId)
    : undefined;
  if (reservation.assignedStaffId && !assignedStaff) {
    return {
      kind: "unexpectedError",
      cause: new Error(`Assigned staff "${reservation.assignedStaffId}" vanished from the catalog before the lock re-check.`),
    };
  }
  const staffSelection: StaffSelectionResolution = assignedStaff ? { kind: "specific", staff: assignedStaff } : { kind: "none" };

  let recheck: AvailabilityResult;
  try {
    const strategy = buildAvailabilityFor(config.calendarId)(
      { date: reservation.date, startTime: reservation.startTime, endTime: reservation.endTime },
      staffSelection,
    );
    recheck = strategy.isAvailable({
      candidateStart: toTokyoLocalDateTimeString(reservation.date, reservation.startTime),
      candidateEnd: toTokyoLocalDateTimeString(reservation.date, reservation.endTime),
    });
  } catch (cause) {
    return { kind: "unexpectedError", cause };
  }

  if (!recheck.available) {
    try {
      markReservationNeedsConfirmation(reservation.reservationId, new Date());
    } catch (cause) {
      return { kind: "unexpectedError", cause };
    }
    return { kind: "needsConfirmationLostRace" };
  }

  const calendarId = assignedStaff
    ? resolveCalendarIdForStaff(assignedStaff, config.calendarId)
    : config.calendarId;

  let calendarEventId: string;
  try {
    calendarEventId = createReservationEvent({
      calendarId,
      title: `${reservation.serviceName} - ${reservation.customerName}`,
      description: `予約番号: ${reservation.reservationId}`,
      date: reservation.date,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
    });
  } catch (cause) {
    try {
      markReservationNeedsConfirmation(reservation.reservationId, new Date());
    } catch (markCause) {
      return { kind: "unexpectedError", cause: markCause };
    }
    return { kind: "needsConfirmationCalendarFailure", reason: cause instanceof Error ? cause.message : String(cause) };
  }

  try {
    markReservationConfirmed(reservation.reservationId, calendarEventId, new Date());
  } catch (cause) {
    return { kind: "sheetUpdateFailedAfterCalendar", calendarEventId, cause };
  }

  return { kind: "confirmed", calendarEventId };
}

export function resolveCreateReservationResponse(
  result: CriticalSectionResult,
  reservation: NormalizedReservation,
): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  switch (result.kind) {
    case "confirmed":
      return buildSuccessResponse({ reservationId: reservation.reservationId });
    case "needsConfirmationCalendarFailure":
      logError({
        action: "createReservation",
        message: "Calendar event creation failed",
        context: { reservationId: reservation.reservationId },
        severity: "error",
      });
      return buildSuccessResponse({ reservationId: reservation.reservationId, needsConfirmation: true });
    case "needsConfirmationLostRace":
      logError({
        action: "createReservation",
        message: "Lost race: slot no longer available at lock time",
        context: { reservationId: reservation.reservationId },
        severity: "warning",
      });
      return buildErrorResponse(
        ERROR_CODES.SLOT_UNAVAILABLE,
        "選択された時間帯は直前に埋まってしまいました。お手数ですが、別の時間帯をお選びください。",
      );
    case "sheetUpdateFailedAfterCalendar":
      logError({
        action: "createReservation",
        message: "Sheet update failed after Calendar event creation",
        context: { reservationId: reservation.reservationId, calendarEventId: result.calendarEventId },
        severity: "critical",
      });
      return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "予約の確定処理に失敗しました。管理者にお問い合わせください。");
    case "unexpectedError":
      console.error("[createReservation] unexpected error in critical section:", reservation.reservationId, result.cause);
      logError({
        action: "createReservation",
        message: "Unexpected error in createReservation critical section",
        context: { reservationId: reservation.reservationId },
        severity: "critical",
      });
      return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

function buildCancellationUrl(reservation: NormalizedReservation, token: string): string {
  const base = getSiteBaseUrl();
  const query = [
    `reservationId=${encodeURIComponent(reservation.reservationId)}`,
    `token=${encodeURIComponent(token)}`,
    `date=${encodeURIComponent(reservation.date)}`,
    `time=${encodeURIComponent(reservation.startTime)}`,
    `service=${encodeURIComponent(reservation.serviceName)}`,
  ].join("&");
  return `${base}/reservation/cancel?${query}`;
}

function trySendAndLog(
  recipientType: "customer" | "owner",
  recipientEmail: string,
  content: { subject: string; body: string },
  reservationId: string,
): boolean {
  try {
    sendEmail(recipientEmail, content.subject, content.body);
    logEmail({ relatedType: "Reservation", relatedId: reservationId, recipientType, recipientEmail, subject: content.subject, status: "sent" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[createReservation] email send failed:", reservationId, recipientType, message);
    logEmail({ relatedType: "Reservation", relatedId: reservationId, recipientType, recipientEmail, subject: content.subject, status: "failed", errorMessage: message });
    logError({ action: "createReservation", message: "Email send failed", context: { reservationId, recipientType }, severity: "warning" });
    return false;
  }
}

/** Step 9 (Phase 0 §U/§M): strictly outside the lock. Never runs at all
 *  for `sheetUpdateFailedAfterCalendar`/`unexpectedError` — the row's
 *  final state is not reliably known in those cases (master §12: never a
 *  false confirmation), and the owner already has a CRITICAL ERROR_LOG
 *  entry, the correct channel for that case. */
function sendReservationEmailsForOutcome(
  result: CriticalSectionResult,
  reservation: NormalizedReservation,
  config: AppConfig,
  cancellationToken: string,
): void {
  if (result.kind !== "confirmed" && result.kind !== "needsConfirmationCalendarFailure" && result.kind !== "needsConfirmationLostRace") {
    return;
  }

  const ctx: ReservationEmailContext = {
    reservationId: reservation.reservationId,
    reservation,
    cancellationUrl: buildCancellationUrl(reservation, cancellationToken),
    businessName: config.business.name,
    serviceLabel: config.labels.service ?? "メニュー",
  };

  let allSucceeded: boolean;
  if (result.kind === "confirmed") {
    const customerOk = trySendAndLog("customer", reservation.email, buildCustomerConfirmationEmail(ctx), reservation.reservationId);
    const ownerOk = trySendAndLog("owner", config.emailOwnerNotifyAddress, buildOwnerConfirmedNotificationEmail(ctx), reservation.reservationId);
    allSucceeded = customerOk && ownerOk;
  } else {
    const reason =
      result.kind === "needsConfirmationCalendarFailure"
        ? result.reason
        : "予約枠の重複が検知されました（直前に埋まった可能性があります）。";
    allSucceeded = trySendAndLog("owner", config.emailOwnerNotifyAddress, buildOwnerNeedsAttentionEmail(ctx, reason), reservation.reservationId);
  }

  try {
    updateReservationEmailStatus(reservation.reservationId, allSucceeded ? "sent" : "failed", new Date());
  } catch (error) {
    console.error("[createReservation] failed to persist EmailStatus:", reservation.reservationId, error);
  }
}

/** Closes the race two truly-simultaneous requests carrying the same
 *  `submissionId` would otherwise have. A short, separate lock
 *  acquisition from the main critical-section lock below. */
function claimSubmissionOrGetExisting(
  submissionId: string,
  appendPendingRow: () => void,
): { kind: "existing"; result: IdempotencyResult } | { kind: "claimed" } {
  const cached = getCachedReservationResult(submissionId);
  if (cached) {
    return { kind: "existing", result: cached };
  }

  const lock = LockService.getScriptLock();
  let acquired = false;
  try {
    acquired = lock.tryLock(IDEMPOTENCY_CLAIM_LOCK_TIMEOUT_MS);
  } catch {
    acquired = false;
  }
  if (!acquired) {
    throw new SystemBusyError();
  }
  try {
    const existingRow = findReservationBySubmissionId(submissionId);
    if (existingRow) {
      const result = mapReservationRowToResult(existingRow);
      setCachedReservationResult(submissionId, result);
      return { kind: "existing", result };
    }
    appendPendingRow();
    return { kind: "claimed" };
  } finally {
    lock.releaseLock();
  }
}

function createReservationActionInner(
  rawPayload: unknown,
): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  const config = getConfig();
  if (!config.features.reservation) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在ご予約の受付を停止しています。");
  }
  if (!rawPayload || typeof rawPayload !== "object") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }

  const now = new Date();
  const services = getServiceRows();
  const staff = config.features.staffSelection ? getStaffRows() : [];

  const evaluation = evaluateReservationRequest({
    request: rawPayload as ReservationRequest,
    services,
    staff,
    config,
    now,
    availabilityFor: buildAvailabilityFor(config.calendarId),
  });
  if (!evaluation.ok) {
    const { code, message } = mapReservationIssueToErrorResponse(evaluation.issues[0]);
    return buildErrorResponse(code, message);
  }

  const reservation = evaluation.reservation;
  const cancellationToken = generateCancellationToken();

  let claim: { kind: "existing"; result: IdempotencyResult } | { kind: "claimed" };
  try {
    claim = claimSubmissionOrGetExisting(reservation.submissionId, () =>
      appendReservationRow(buildPendingReservationRow(reservation, now, cancellationToken)),
    );
  } catch (error) {
    if (error instanceof SystemBusyError) {
      return buildErrorResponse(ERROR_CODES.SYSTEM_BUSY, "只今混み合っております。少々時間をおいて再度お試しください。");
    }
    logError({ action: "createReservation", message: "Failed while claiming submissionId", context: { submissionId: reservation.submissionId }, severity: "error" }, now);
    return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "予約の受付処理に失敗しました。時間をおいて再度お試しください。");
  }

  if (claim.kind === "existing") {
    return buildSuccessResponse(claim.result);
  }

  const lock = LockService.getScriptLock();
  let lockAcquired = false;
  try {
    lockAcquired = lock.tryLock(CRITICAL_SECTION_LOCK_TIMEOUT_MS);
  } catch {
    lockAcquired = false;
  }
  if (!lockAcquired) {
    logError({ action: "createReservation", message: "Lock acquisition timed out", context: { reservationId: reservation.reservationId }, severity: "warning" }, now);
    return buildErrorResponse(ERROR_CODES.SYSTEM_BUSY, "只今混み合っております。少々時間をおいて再度お試しください。");
  }

  let result: CriticalSectionResult;
  try {
    result = runReservationCriticalSection(reservation, config, staff);
  } finally {
    lock.releaseLock();
  }

  const response = resolveCreateReservationResponse(result, reservation);
  if (response.ok) {
    setCachedReservationResult(reservation.submissionId, response.data);
  }
  // `response` is fully decided by this point (and, on success, the
  // reservation is already persisted — Sheet row + Calendar event both
  // real). Sending emails must never be allowed to override it: an
  // unguarded throw here (e.g. getSiteBaseUrl() if SITE_BASE_URL isn't
  // set) would otherwise propagate up to createReservationAction's
  // top-level catch and turn an already-successful reservation into a
  // false INTERNAL_ERROR told to the customer, with no emails sent at
  // all — the exact false-negative-after-real-success failure mode this
  // whole design exists to avoid in the other direction (no false
  // confirmations). trySendAndLog already isolates a single send
  // failure; this outer try/catch isolates failures in the surrounding
  // email-context construction (e.g. buildCancellationUrl) the same way.
  try {
    sendReservationEmailsForOutcome(result, reservation, config, cancellationToken);
  } catch (error) {
    console.error("[createReservation] sendReservationEmailsForOutcome threw:", reservation.reservationId, error);
    logError({
      action: "createReservation",
      message: "Unexpected error while sending post-reservation emails",
      context: { reservationId: reservation.reservationId },
      severity: "critical",
    });
  }
  return response;
}

/** `createReservation` action handler (master spec §U). Thin outer
 *  wrapper: maps `ConfigStore`/`RowMapper` infrastructure errors the same
 *  way `getConfigAction` does, so a CONFIG/catalog sheet problem never
 *  crashes past `Api.ts`'s boundary. */
export function createReservationAction(
  rawPayload: unknown,
): ApiResponse<{ reservationId: string; needsConfirmation?: boolean }> {
  try {
    return createReservationActionInner(rawPayload);
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[createReservation] unexpected top-level error:", error);
    logError({ action: "createReservation", message: "Unexpected top-level error", severity: "critical" });
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}

/** Closes the race two truly-simultaneous requests carrying the same
 *  `submissionId` would otherwise have — same shape as
 *  `claimSubmissionOrGetExisting` above, but for the much simpler Inquiry
 *  flow (no second critical-section lock: there is no availability to
 *  re-check, so claiming the submissionId is the only lock this flow
 *  needs). */
function claimInquirySubmissionOrGetExisting(
  submissionId: string,
  appendPendingRow: () => void,
): { kind: "existing"; result: InquiryIdempotencyResult } | { kind: "claimed" } {
  const cached = getCachedInquiryResult(submissionId);
  if (cached) {
    return { kind: "existing", result: cached };
  }

  const lock = LockService.getScriptLock();
  let acquired = false;
  try {
    acquired = lock.tryLock(IDEMPOTENCY_CLAIM_LOCK_TIMEOUT_MS);
  } catch {
    acquired = false;
  }
  if (!acquired) {
    throw new SystemBusyError();
  }
  try {
    const existingRow = findInquiryBySubmissionId(submissionId);
    if (existingRow) {
      const result = mapInquiryRowToResult(existingRow);
      setCachedInquiryResult(submissionId, result);
      return { kind: "existing", result };
    }
    appendPendingRow();
    return { kind: "claimed" };
  } finally {
    lock.releaseLock();
  }
}

function trySendInquiryEmailAndLog(
  recipientType: "customer" | "owner",
  recipientEmail: string,
  content: { subject: string; body: string },
  inquiryId: string,
): boolean {
  try {
    sendEmail(recipientEmail, content.subject, content.body);
    logEmail({ relatedType: "Inquiry", relatedId: inquiryId, recipientType, recipientEmail, subject: content.subject, status: "sent" });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[createInquiry] email send failed:", inquiryId, recipientType, message);
    logEmail({ relatedType: "Inquiry", relatedId: inquiryId, recipientType, recipientEmail, subject: content.subject, status: "failed", errorMessage: message });
    logError({ action: "createInquiry", message: "Email send failed", context: { inquiryId, recipientType }, severity: "warning" });
    return false;
  }
}

function createInquiryActionInner(rawPayload: unknown): ApiResponse<{ inquiryId: string }> {
  const config = getConfig();
  if (!config.features.contactForm) {
    return buildErrorResponse(ERROR_CODES.FEATURE_DISABLED, "現在お問い合わせの受付を停止しています。");
  }
  if (!rawPayload || typeof rawPayload !== "object") {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, "リクエストの形式が正しくありません。");
  }

  const now = new Date();
  const normalized = normalizeInquiryRequest(rawPayload as InquiryRequest);
  const issues = validateInquiryRequestShape(normalized);
  if (issues.length > 0) {
    return buildErrorResponse(ERROR_CODES.VALIDATION_ERROR, issues[0].message ?? "入力内容をご確認ください。");
  }

  const inquiryId = generateInquiryId(now);

  let claim: { kind: "existing"; result: InquiryIdempotencyResult } | { kind: "claimed" };
  try {
    claim = claimInquirySubmissionOrGetExisting(normalized.submissionId, () =>
      appendInquiryRow(buildPendingInquiryRow(normalized, inquiryId, now)),
    );
  } catch (error) {
    if (error instanceof SystemBusyError) {
      return buildErrorResponse(ERROR_CODES.SYSTEM_BUSY, "只今混み合っております。少々時間をおいて再度お試しください。");
    }
    logError({ action: "createInquiry", message: "Failed while claiming submissionId", context: { submissionId: normalized.submissionId }, severity: "error" }, now);
    return buildErrorResponse(ERROR_CODES.SHEET_ERROR, "お問い合わせの受付処理に失敗しました。時間をおいて再度お試しください。");
  }

  if (claim.kind === "existing") {
    return buildSuccessResponse(claim.result);
  }

  setCachedInquiryResult(normalized.submissionId, { inquiryId });

  // Emails are strictly best-effort, outside the response's success/failure
  // decision — the inquiry is already durably recorded by this point, same
  // "never let email sending override an already-decided outcome" principle
  // as sendReservationEmailsForOutcome above.
  try {
    const ctx: InquiryEmailContext = { inquiryId, inquiry: normalized, businessName: config.business.name, createdAt: now };
    trySendInquiryEmailAndLog("customer", normalized.email, buildCustomerInquiryConfirmationEmail(ctx), inquiryId);
    trySendInquiryEmailAndLog("owner", config.emailOwnerNotifyAddress, buildOwnerInquiryNotificationEmail(ctx), inquiryId);
  } catch (error) {
    console.error("[createInquiry] unexpected error while sending inquiry emails:", inquiryId, error);
    logError({ action: "createInquiry", message: "Unexpected error while sending inquiry emails", context: { inquiryId }, severity: "critical" });
  }

  return buildSuccessResponse({ inquiryId });
}

/** `createInquiry` action handler (Starter MVP §5). Thin outer wrapper:
 *  same ConfigError/MissingHeadersError mapping as `createReservationAction`
 *  above, so a CONFIG/sheet problem never crashes past `Api.ts`'s boundary. */
export function createInquiryAction(rawPayload: unknown): ApiResponse<{ inquiryId: string }> {
  try {
    return createInquiryActionInner(rawPayload);
  } catch (error) {
    if (error instanceof ConfigError) {
      return mapConfigErrorToResponse(error);
    }
    if (error instanceof MissingHeadersError) {
      return mapMissingHeadersErrorToResponse(error);
    }
    console.error("[createInquiry] unexpected top-level error:", error);
    logError({ action: "createInquiry", message: "Unexpected top-level error", severity: "critical" });
    return buildErrorResponse(ERROR_CODES.INTERNAL_ERROR, "サーバーエラーが発生しました。");
  }
}
