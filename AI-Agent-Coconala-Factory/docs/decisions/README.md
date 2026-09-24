# Architecture Decision Records

| # | Decision | Status |
|---|---|---|
| [0001](0001-standalone-factory.md) | Standalone factory folder; salon apps are read-only references | Accepted |
| [0002](0002-toolchain.md) | TypeScript + Vitest + esbuild (IIFE + footer) + clasp; data as JSON validated by zod | Accepted |
| [0003](0003-asset-versioning.md) | Versioned ids, pinned action refs, asset lock | Accepted |
| [0004](0004-deterministic-agents.md) | Phase 1 agents are deterministic code with written contracts | Accepted |
| [0005](0005-line-webhook-auth.md) | LINE webhook auth by URL key (GAS cannot read headers); API off by default | Accepted; the key is proxy→GAS auth since 0008 |
| [0006](0006-reservation-requests.md) | Reservations are requests confirmed by the owner; LINE date-time picker | Accepted |
| [0007](0007-structure-deviations.md) | Deviations from the suggested folder structure | Accepted |
| [0008](0008-line-webhook-proxy.md) | x-line-signature verified in a minimal Cloudflare Worker proxy in front of GAS | Accepted |
| [0009](0009-rich-menu-renderer.md) | Local deterministic Rich Menu renderer (SVG + resvg + pinned Noto Sans JP) | Accepted |
