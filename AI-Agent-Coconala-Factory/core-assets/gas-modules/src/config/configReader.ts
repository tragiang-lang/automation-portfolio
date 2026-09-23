import { ActionError, ERROR_CODES } from "../lib/result";
import type { Row, RuntimeConfigKey } from "../services/context";

/**
 * Typed reader over the CONFIG sheet (`key` / `value` / `description`).
 * Parsing follows the salon apps' ConfigParser rules: the first duplicate
 * key wins, booleans only from true/false, numbers only from a strict
 * decimal pattern. Values are never echoed into errors, only key names.
 */

export const CONFIG_SHEET = "CONFIG";
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

export class ConfigReader {
  private readonly values: Record<string, unknown> = {};

  constructor(rows: Row[], private readonly defaults: RuntimeConfigKey[] = []) {
    for (const row of rows) {
      const key = String(row.key ?? "").trim();
      if (key.length > 0 && !(key in this.values)) {
        this.values[key] = row.value;
      }
    }
  }

  private raw(key: string): string | undefined {
    const value = this.values[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
    const fallback = this.defaults.find((entry) => entry.key === key)?.default;
    return fallback !== undefined && fallback !== "" ? fallback : undefined;
  }

  optionalString(key: string): string | undefined {
    return this.raw(key);
  }

  requiredString(key: string): string {
    const value = this.raw(key);
    if (value === undefined) {
      throw new ActionError(ERROR_CODES.CONFIG_INVALID, `CONFIG key "${key}" is missing`);
    }
    return value;
  }

  number(key: string, fallback?: number): number {
    const value = this.raw(key);
    if (value === undefined) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw new ActionError(ERROR_CODES.CONFIG_INVALID, `CONFIG key "${key}" is missing`);
    }
    if (!NUMBER_PATTERN.test(value)) {
      throw new ActionError(ERROR_CODES.CONFIG_INVALID, `CONFIG key "${key}" is not a number`);
    }
    return Number(value);
  }

  boolean(key: string, fallback: boolean): boolean {
    const raw = this.values[key];
    if (typeof raw === "boolean") {
      return raw;
    }
    const value = this.raw(key);
    if (value === undefined) {
      return fallback;
    }
    if (/^(true|false)$/i.test(value)) {
      return value.toLowerCase() === "true";
    }
    throw new ActionError(ERROR_CODES.CONFIG_INVALID, `CONFIG key "${key}" is not true/false`);
  }

  /** Keys that are required by the schema but have neither a value nor a default. */
  missingRequiredKeys(): string[] {
    return this.defaults.filter((entry) => entry.required && this.raw(entry.key) === undefined).map((entry) => entry.key);
  }
}
