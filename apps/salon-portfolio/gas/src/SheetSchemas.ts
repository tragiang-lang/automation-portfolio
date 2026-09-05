import { SHEET_NAMES, SheetName } from "./SheetNames";

/** CONFIG: human-editable key/value/description rows (Phase 0 §C). */
export const CONFIG_HEADERS = ["Key", "Value", "Description"] as const;
export interface ConfigRow {
  Key: unknown;
  Value: unknown;
  Description?: unknown;
}

/** HOLIDAYS: one row per closed date (Phase 0 §C). */
export const HOLIDAYS_HEADERS = ["Date", "Label"] as const;
export interface HolidayRow {
  Date: unknown;
  Label?: unknown;
}

/** SERVICES: salon menu/service catalog (Phase 0 §C). */
export const SERVICES_HEADERS = [
  "ServiceID",
  "Name",
  "DurationMinutes",
  "Price",
  "Active",
  "StaffRequired",
  "DisplayOrder",
] as const;
export interface ServiceRow {
  ServiceID: string;
  Name: string;
  DurationMinutes: number;
  Price: number;
  Active: boolean;
  StaffRequired: boolean;
  DisplayOrder: number;
}

/** STAFF: salon stylist catalog (Phase 0 §C). */
export const STAFF_HEADERS = [
  "StaffID",
  "Name",
  "Active",
  "CalendarID",
  "DisplayOrder",
] as const;
export interface StaffRow {
  StaffID: string;
  Name: string;
  Active: boolean;
  CalendarID?: string;
  DisplayOrder: number;
}

/** RESERVATIONS: persisted reservation records (Phase 0 §C/§E). Schema
 *  only in Phase 3A — no code path writes to this sheet yet. */
export const RESERVATIONS_HEADERS = [
  "ReservationID",
  "SubmissionID",
  "CreatedAt",
  "UpdatedAt",
  "Name",
  "Email",
  "Phone",
  "Date",
  "Time",
  "ServiceID",
  "StaffID",
  "Notes",
  "Status",
  "CalendarEventID",
  "EmailStatus",
  "CancellationToken",
] as const;
export interface ReservationRow {
  ReservationID: string;
  SubmissionID: string;
  CreatedAt: string;
  UpdatedAt: string;
  Name: string;
  Email: string;
  Phone?: string;
  Date: string;
  Time: string;
  ServiceID: string;
  StaffID?: string;
  Notes?: string;
  Status: string;
  CalendarEventID?: string;
  EmailStatus: string;
  CancellationToken: string;
}

/** CANCELLATION_REQUESTS (Phase 0 §C/§L). Schema only in Phase 3A. */
export const CANCELLATION_REQUESTS_HEADERS = [
  "CancellationRequestID",
  "ReservationID",
  "RequestedAt",
  "RequesterName",
  "RequesterEmail",
  "Reason",
  "Status",
  "ProcessedAt",
  "ProcessedBy",
  "Notes",
] as const;
export interface CancellationRequestRow {
  CancellationRequestID: string;
  ReservationID: string;
  RequestedAt: string;
  RequesterName: string;
  RequesterEmail: string;
  Reason?: string;
  Status: string;
  ProcessedAt?: string;
  ProcessedBy?: string;
  Notes?: string;
}

/** INQUIRIES: contact-form submissions (Phase 0 §C/§F). Schema only. */
export const INQUIRIES_HEADERS = [
  "InquiryID",
  "SubmissionID",
  "CreatedAt",
  "Name",
  "Email",
  "Phone",
  "Subject",
  "Message",
  "Source",
  "Status",
] as const;
export interface InquiryRow {
  InquiryID: string;
  SubmissionID: string;
  CreatedAt: string;
  Name: string;
  Email: string;
  Phone?: string;
  Subject?: string;
  Message: string;
  Source?: string;
  Status: string;
}

/** EMAIL_LOG (Phase 0 §C/§M). Schema only. */
export const EMAIL_LOG_HEADERS = [
  "EmailLogID",
  "CreatedAt",
  "RelatedType",
  "RelatedID",
  "RecipientType",
  "RecipientEmail",
  "Subject",
  "Status",
  "ErrorMessage",
] as const;
export interface EmailLogRow {
  EmailLogID: string;
  CreatedAt: string;
  RelatedType: string;
  RelatedID: string;
  RecipientType: string;
  RecipientEmail: string;
  Subject: string;
  Status: string;
  ErrorMessage?: string;
}

/** ERROR_LOG (Phase 0 §C/§N/§O). Never stores secrets or raw personal
 *  data — `ContextJSON` may reference an id but not contact details. */
export const ERROR_LOG_HEADERS = [
  "ErrorID",
  "CreatedAt",
  "Action",
  "Message",
  "Stack",
  "ContextJSON",
  "Severity",
] as const;
export interface ErrorLogRow {
  ErrorID: string;
  CreatedAt: string;
  Action: string;
  Message: string;
  Stack?: string;
  ContextJSON?: string;
  Severity: string;
}

/** Required headers per sheet, keyed by canonical sheet name — used for
 *  missing-header detection (Phase 3A §15) before any row mapping. */
export const REQUIRED_HEADERS: Record<SheetName, readonly string[]> = {
  [SHEET_NAMES.CONFIG]: CONFIG_HEADERS,
  [SHEET_NAMES.HOLIDAYS]: HOLIDAYS_HEADERS,
  [SHEET_NAMES.SERVICES]: SERVICES_HEADERS,
  [SHEET_NAMES.STAFF]: STAFF_HEADERS,
  [SHEET_NAMES.RESERVATIONS]: RESERVATIONS_HEADERS,
  [SHEET_NAMES.CANCELLATION_REQUESTS]: CANCELLATION_REQUESTS_HEADERS,
  [SHEET_NAMES.INQUIRIES]: INQUIRIES_HEADERS,
  [SHEET_NAMES.EMAIL_LOG]: EMAIL_LOG_HEADERS,
  [SHEET_NAMES.ERROR_LOG]: ERROR_LOG_HEADERS,
};
