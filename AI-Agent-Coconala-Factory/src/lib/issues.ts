/** One finding from validation or QA. `rule` ids are listed in core-assets/qa-rules/qa-rules-v1.json. */
export interface Issue {
  severity: "error" | "warning";
  rule: string;
  message: string;
  /** File or asset the finding is about. */
  where?: string;
}

export const error = (rule: string, message: string, where?: string): Issue => ({ severity: "error", rule, message, where });
export const warning = (rule: string, message: string, where?: string): Issue => ({ severity: "warning", rule, message, where });

export function hasErrors(issues: readonly Issue[]): boolean {
  return issues.some((issue) => issue.severity === "error");
}

export function formatIssues(issues: readonly Issue[]): string {
  return issues.map((i) => `${i.severity === "error" ? "ERROR" : "warn "} [${i.rule}] ${i.message}${i.where ? `  (${i.where})` : ""}`).join("\n");
}
