# Phase 1.6 implementation note (written after inspection, before code changes)

## F1
current flow:
  `core-assets/industries/common/customer-intents-v1.json` (one global catalog)
  → `registry.intentCatalog()` (latest id, same for every industry)
  → `analyzeIndustry()` in `src/agents/industrySpecialist.ts` matches each brief
    requirement line against `intent.keywords` (`matchesKeyword`)
  → intent.workflows → `recommendedWorkflows` → `planWorkflows()`

target:
  common `intent.keywords` + `industry.intentAliases[intent.id]` (only the
  selected industry's asset) → same matcher → same workflow mapping.
  `intentAliases` is optional in `industryAsset`; absent = old behaviour.
  `validateAssets` rejects alias keys that are not intents in the catalog (WF_EXISTS).
  Data: `real-estate-v1.json` gets `intentAliases`, version 1.0.0 → 1.1.0
  (compatible change per ADR 0003), then `lock-assets`.

## F2
current hard-coded delivery wording (`src/generators/delivery.ts`, `setupMd`, step 5):
  `hasServices = schema.sheets.some(s => s.name === "SERVICES")`
  → 「`SERVICES` シートにメニューを入力します（`active` を TRUE にした行だけがお客様に表示されます）。」
  Emitted for real_estate because reservation-basic-v1 requires SERVICES.

target:
  domain-neutral line derived from the generated schema: sheets that have an
  `active` column (owner-curated master data) are listed, with wording
  「必要に応じて、各ワークフローで使用する情報を … シートに入力します」.
  No sheet-name or industry branch in the generator.

## F3
current:
  `real-estate-v1.json` `assumptions: string[]` and
  `extensionPoints: { implemented: string[], planned: {id, description}[] }`
  → zod `industryAsset` strips unknown keys → dropped; never reach
  `analysis/industry-profile.json` or `DELIVERY.md`.

target:
  `industryAsset` gets optional `assumptions` and `extensionPoints` (shape of the
  existing released asset, so no asset edit is needed for F3)
  → `IndustryProfile.assumptions` = industry assumptions + analysis assumptions
    (existing field, already rendered under 前提・注意事項)
  → `IndustryProfile.extensionPoints` (only when present)
  → `DELIVERY.md` 今後の拡張候補 lists the industry's planned extension points.
