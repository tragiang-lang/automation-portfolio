# Templates

- `briefs/hair-salon.example.json`: the brief behind `projects/2026/demo-hair-salon`.
- `briefs/restaurant.example.json`: the brief behind `projects/2026/demo-restaurant` (second-industry check).
- `briefs/nail-salon.example.json`: the brief behind `projects/2026/demo-nail-salon` (Japanese requirement lines, quiet-luxury preset with brand color overrides).
- `briefs/spa.example.json`: the brief behind `projects/2026/demo-spa` (Japanese requirement lines, warm-natural preset with brand color overrides).

Copy one, change `project.slug`, the client name, requirements, brand and `config`, then run
`npm run factory -- create-project --brief <your-brief.json>`. Use only fictional data in templates.
