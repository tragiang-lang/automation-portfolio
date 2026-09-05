import { AppConfig, PublicConfig } from "./models/Config";

/** Strips internal-only fields before a config is ever sent to the
 *  frontend (Phase 3A §20). calendarId and the owner-facing email
 *  settings must never appear in a getConfig response. */
export function buildPublicConfig(config: AppConfig): PublicConfig {
  return {
    business: config.business,
    hours: config.hours,
    holidays: config.holidays,
    features: config.features,
    staffAnyAvailableOption: config.staffAnyAvailableOption,
    reservation: config.reservation,
  };
}
