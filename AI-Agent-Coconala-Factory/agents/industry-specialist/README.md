# Industry Specialist Agent

**Input:** `industry`, `businessType`, `requirements[]` (free text), optional explicit `intents[]`,
`existingResources[]`.
**Output:** `industry-profile.json` with business type, detected customer intents (with source and
evidence), common LINE use cases, recommended Rich Menu and its sections, recommended workflows
and actions, required spreadsheet data, notification requirements, terminology, risks, and assumptions.

Rules:
- Industry facts come only from `core-assets/industries/<category>/<industry>-v<N>.json`.
- Requirement lines map to intents through `core-assets/industries/common/customer-intents-v1.json` keywords.
- A requirement that matches nothing is **recorded as an assumption** for human review, never guessed.
- If nothing matches at all, it falls back to the industry's default intents and says so.
