# Workflow Planner Agent

**Input:** industry profile + brief overrides.
**Output:** `selected-workflows.json` (selected workflows with reasons, deferred workflows with
reasons, chosen Rich Menu and design preset, extension points) and `workflow.json` (frozen
copies of the workflow and action definitions used).

Rules:
- Selects only `stable` workflows whose actions are all `available`. Anything else is **deferred** with a reason.
- The chosen Rich Menu must only have buttons for selected workflows. Otherwise it is an error: pick
  another menu or add a menu asset. There is no silent partial menu.
- Every workflow and action is referenced with its version.
