# 0004: Agents are deterministic code in Phase 1

**Context.** The vision is an "AI agent team". Phase 1 must be testable and reproducible.

**Decision.** Each logical agent is a pure TypeScript function with a written contract in
`agents/<name>/README.md` (inputs, outputs, rules, what it must not do). Industry knowledge lives
in Core Assets, not in code. Output is deterministic (no timestamps, stable JSON), so
regeneration is byte-identical and can be reviewed as a diff.

**Consequences.** An LLM (Claude) can later sit in front of an agent, for example turning a
free-form chat with a client into `brief.json` or proposing a new industry asset. Its output
still goes through the same schemas, validation, and QA. The keyword intent matcher is
intentionally simple, and unmatched requirement lines are surfaced as assumptions, never guessed.
