import { transitionWorkflow, type ReportWorkflowState, type WorkflowEvent } from "./reportWorkflow";

describe("transitionWorkflow", () => {
  it("DRAFT + CONFIRM -> CONFIRMING", () => {
    expect(transitionWorkflow("DRAFT", { type: "CONFIRM" })).toBe("CONFIRMING");
  });

  it("CONFIRMING + BACK -> DRAFT", () => {
    expect(transitionWorkflow("CONFIRMING", { type: "BACK" })).toBe("DRAFT");
  });

  it("CONFIRMING + SUBMIT_SUCCESS -> SUBMITTED", () => {
    expect(transitionWorkflow("CONFIRMING", { type: "SUBMIT_SUCCESS" })).toBe("SUBMITTED");
  });

  it("CONFIRMING + SUBMIT_FAILURE -> DRAFT", () => {
    expect(transitionWorkflow("CONFIRMING", { type: "SUBMIT_FAILURE" })).toBe("DRAFT");
  });

  it("SUBMITTED + BACK is a no-op (cannot transition to DRAFT)", () => {
    expect(transitionWorkflow("SUBMITTED", { type: "BACK" })).toBe("SUBMITTED");
  });

  it("SUBMITTED + CONFIRM is a no-op (cannot transition to CONFIRMING)", () => {
    expect(transitionWorkflow("SUBMITTED", { type: "CONFIRM" })).toBe("SUBMITTED");
  });

  it("SUBMITTED + SUBMIT_SUCCESS is a no-op", () => {
    expect(transitionWorkflow("SUBMITTED", { type: "SUBMIT_SUCCESS" })).toBe("SUBMITTED");
  });

  it("SUBMITTED + SUBMIT_FAILURE is a no-op", () => {
    expect(transitionWorkflow("SUBMITTED", { type: "SUBMIT_FAILURE" })).toBe("SUBMITTED");
  });

  it("DRAFT + BACK is a no-op (no such transition)", () => {
    expect(transitionWorkflow("DRAFT", { type: "BACK" })).toBe("DRAFT");
  });

  it("DRAFT + SUBMIT_SUCCESS is a no-op (no such transition)", () => {
    expect(transitionWorkflow("DRAFT", { type: "SUBMIT_SUCCESS" })).toBe("DRAFT");
  });

  it("DRAFT + SUBMIT_FAILURE is a no-op (no such transition)", () => {
    expect(transitionWorkflow("DRAFT", { type: "SUBMIT_FAILURE" })).toBe("DRAFT");
  });

  it("CONFIRMING + CONFIRM is a no-op (no such transition)", () => {
    expect(transitionWorkflow("CONFIRMING", { type: "CONFIRM" })).toBe("CONFIRMING");
  });

  it("every ReportWorkflowState/WorkflowEvent pair is exhaustively handled without throwing", () => {
    const states: ReportWorkflowState[] = ["DRAFT", "CONFIRMING", "SUBMITTED"];
    const events: WorkflowEvent[] = [
      { type: "CONFIRM" },
      { type: "BACK" },
      { type: "SUBMIT_SUCCESS" },
      { type: "SUBMIT_FAILURE" },
    ];
    for (const state of states) {
      for (const event of events) {
        expect(() => transitionWorkflow(state, event)).not.toThrow();
      }
    }
  });
});
