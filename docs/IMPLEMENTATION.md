# Implementation Guide

This document describes the RecallNet codebase structure, key modules, and how the main features are implemented.

## Project structure

```
RecallNet/
├── docs/                    # Documentation (this folder)
├── seed/
│   ├── video-demo.csv       # Live CPSC products for demo video
│   ├── live-demo.csv        # Same content (backup)
│   └── HERO_PRODUCTS.md     # CSV format reference
├── scripts/
│   ├── deploy-aws.sh        # Terraform apply + optional seed
│   ├── seed-dynamodb.ts     # Production seed script
│   └── terraform-env.sh     # Export Terraform outputs as env vars
├── terraform/               # AWS infrastructure (DynamoDB, IAM, S3)
├── src/
│   ├── app/                 # Next.js App Router pages + API routes
│   ├── components/          # React UI components
│   └── lib/                 # Business logic, DB, matching
└── package.json
```

## Application layers

```
┌─────────────────────────────────────────┐
│  Presentation (src/app, src/components) │
├─────────────────────────────────────────┤
│  API Routes (src/app/api)               │
├─────────────────────────────────────────┤
│  Domain Logic (src/lib)                 │
│  matcher · eligibility · risk-score     │
├─────────────────────────────────────────┤
│  Data Access (src/lib/db)               │
│  store interface · memory · dynamodb    │
└─────────────────────────────────────────┘
```

## Pages and routes

| Route | File | Type | Purpose |
| ----- | ---- | ---- | ------- |
| `/` | `app/page.tsx` | Server | Landing page, CTA |
| `/upload` | `app/upload/page.tsx` | Client | CSV paste, live CPSC video demo loader |
| `/dashboard` | `app/dashboard/page.tsx` + `DashboardClient.tsx` | Client | Alerts, score, modal |
| `/graph` | `app/graph/page.tsx` + `GraphClient.tsx` | Client | Safety Graph hero UI |
| `/recalls` | `app/recalls/page.tsx` | Client | Live CPSC feed + sync |
| `/report/[token]` | `app/report/[token]/page.tsx` | Server | Public share report |

Session management uses `localStorage` via [`src/lib/session.ts`](../src/lib/session.ts) — no auth provider for hackathon MVP. Each browser session gets a UUID; upload and dashboard share the same session automatically.

## API routes

See [API Reference](./API.md) for full schemas. Route handlers live in `src/app/api/`:

| Path | Methods | Handler |
| ---- | ------- | ------- |
| `/api/health` | GET | Storage mode + ping |
| `/api/ingest/csv` | POST | CSV → ownership events → match |
| `/api/ingest/text` | POST | Free-text product list |
| `/api/dashboard` | GET | Summary + alerts + products |
| `/api/admin/simulate-recall` | GET, POST | Deprecated — use `/api/recalls` |
| `/api/report/generate` | POST | Create share token |
| `/api/report/[token]` | GET | Public report JSON |

## Database layer

### RecallStore interface

[`src/lib/db/store.ts`](../src/lib/db/store.ts) defines the contract:

```typescript
interface RecallStore {
  ping(): Promise<boolean>;
  // Products
  getProduct, putProduct, listProducts, findProductByUpc, findProductByTokens
  // Ownership
  putOwnershipEvent, listOwnershipByUser, listOwnersByProduct
  // Recalls
  putRecallEvent, getRecall, listActiveRecalls, listRecallsForProduct
  // Alerts
  putUserRecallStatus, listUserRecallStatus, deleteUserRecallStatus
  // Share reports
  putShareReport, getShareReport
  // Seed
  seedInitialData(): Promise<void>
}
```

### Memory store

[`src/lib/db/memory.ts`](../src/lib/db/memory.ts) — in-process Maps implementing the same interface. Used when `USE_LOCAL_STORE=true`. Implements GSI query patterns as in-memory filters.

### DynamoDB store

[`src/lib/db/dynamodb.ts`](../src/lib/db/dynamodb.ts) — AWS SDK v3 implementation:

- Uses `@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`
- Composite keys: `PK`/`SK` for event tables
- GSI queries: `ProductOwnersIndex`, `ProductRecallsIndex`, `ActiveRecallsIndex`
- Table names from environment variables

### Store selection

[`src/lib/db/client.ts`](../src/lib/db/client.ts):

```typescript
export async function getStore(): Promise<RecallStore> {
  // Singleton with lazy init
  // memory if USE_LOCAL_STORE or no AWS creds
  // dynamodb otherwise, fallback to memory on ping failure
  // always calls seedInitialData() on first access
}
```

## Matching engine

[`src/lib/matcher.ts`](../src/lib/matcher.ts) — core recall detection logic.

### `normalizeLineItem(store, item)`

Resolves a CSV line item to a `Product`:

1. **UPC exact** → `findProductByUpc` → HIGH confidence
2. **Token fuzzy** → `findProductByTokens` + `tokenOverlap ≥ 0.35` → MEDIUM
3. **New product** → create with generated ID → LOW

### `ingestLineItems(store, userId, items)`

For each parsed line item:

1. Normalize to product
2. Create `OwnershipEvent` (append-only)
3. Call `matchUserProducts` to generate alerts

### `matchUserProducts(store, userId)`

For each owned product:

1. Query recalls via `listRecallsForProduct` (GSI)
2. Evaluate eligibility against purchase date
3. Create/update `UserRecallStatus` projection

### `fanOutRecall(store, recallId)`

New recall notification path:

1. Get recall event
2. For each `productId` → `listOwnersByProduct` (ProductOwnersIndex GSI)
3. Re-run matcher for each affected user
4. Return `{ ownersNotified, alerts }`

## Eligibility engine

[`src/lib/eligibility.ts`](../src/lib/eligibility.ts):

| Function | Purpose |
| -------- | ------- |
| `evaluateEligibility(purchaseDate, rules)` | ELIGIBLE / EXPIRED / UNKNOWN |
| `severityToAction(severity, eligibility)` | STOP_USE / SUBMIT_CLAIM / REGISTER / NONE |
| `sumEligibleRemedy(alerts)` | Dashboard `$150` card |
| `productStatusFromAlerts(productId, alerts)` | SAFE / RECALLED / ACTION_REQUIRED / EXPIRED |

Hero live CPSC scenarios:

| Product | Match | Expected alert |
| ------- | ----- | -------------- |
| Cosori Dual Blaze Air Fryer | Brand/name | STOP USE — fire/burn |
| Arizer Solo III | UPC `628078802274` | STOP USE — fire/burn |
| BABESIDE Doll and Stroller | Name | STOP USE — choking |

## CSV parser

[`src/lib/csv-parser.ts`](../src/lib/csv-parser.ts):

- Parses Amazon-style order CSV (title, date, price, quantity, UPC columns)
- Flexible header detection
- `tokenOverlap(a, b)` — Jaccard-like token similarity for fuzzy matching
- Exports `ParsedLineItem` type used by matcher

Video demo file: [`seed/video-demo.csv`](../seed/video-demo.csv) — 5 items, 3 live CPSC recalls. Inline constant in [`src/lib/live-demo-csv.ts`](../src/lib/live-demo-csv.ts).

## Dashboard builder

[`src/lib/dashboard.ts`](../src/lib/dashboard.ts) — aggregates data for UI:

1. Load user alerts → `sortAlerts` (infant STOP USE first)
2. Load ownership events → build product list
3. Compute `eligibleRemedyValueUsd`, `stopUseCount`
4. Compute `householdSafetyScore` via risk engine
5. Return `DashboardResponse`

Alert sort order in [`src/lib/sort-alerts.ts`](../src/lib/sort-alerts.ts):

1. Baby category + STOP_USE
2. Other STOP_USE
3. ELIGIBLE
4. EXPIRED
5. Safe

## Hero features

### Household Safety Score

[`src/lib/risk-score.ts`](../src/lib/risk-score.ts) + [`src/components/SafetyScoreCard.tsx`](../src/components/SafetyScoreCard.tsx)

- Computes score from highest-risk alert factors
- Displays `N/100` with band label and `+points` breakdown
- Example: `90/100 Critical` — Fire hazard +45, Child product +30, Active recall +15

### Safety Graph

[`src/components/SafetyGraph.tsx`](../src/components/SafetyGraph.tsx) at `/graph`

Tree visualization:

```
You
├── BABESIDE Doll and Stroller Playset
│   └── STOP USE (choking)
├── Cosori Dual Blaze Air Fryer
│   └── STOP USE (fire/burn)
└── Arizer Solo III Portable Vaporizer
    └── STOP USE (fire/burn)
```

Data from `buildDashboard()` — same API as dashboard page.

### Recall Explanation Agent

[`src/lib/recall-explanation.ts`](../src/lib/recall-explanation.ts) + [`src/components/RecallExplanation.tsx`](../src/components/RecallExplanation.tsx)

Deterministic template (not LLM):

```
This recall affects your {productName} because {hazardDescription}.
We matched this item with {confidence} confidence ({matchReason}).
{action guidance}
```

Rendered inside `AlertModal` when user expands an alert.

## UI components

| Component | File | Purpose |
| --------- | ---- | ------- |
| `AlertCounter` | `AlertCounter.tsx` | Animated count-up on dashboard load |
| `AlertModal` | `AlertModal.tsx` | Alert detail + Recall Explanation |
| `StopUseBanner` | `StopUseBanner.tsx` | Persistent red banner for STOP USE |
| `SafetyScoreCard` | `SafetyScoreCard.tsx` | Household Safety Score display |
| `SafetyGraph` | `SafetyGraph.tsx` | Tree visualization |
| `RecallExplanation` | `RecallExplanation.tsx` | Plain-language hazard narrative |
| `Footer` | `Footer.tsx` | Legal disclaimer |

## Live demo CSV

[`src/lib/live-demo-csv.ts`](../src/lib/live-demo-csv.ts) — inline CSV for the upload page video demo loader:

| Export | Contents |
| ------ | -------- |
| `VIDEO_DEMO_CSV` | 5 products — Cosori, Arizer (UPC), BABESIDE + 2 safe items |

File backup: [`seed/video-demo.csv`](../seed/video-demo.csv)

## CPSC recall sync

[`scripts/seed-dynamodb.ts`](../scripts/seed-dynamodb.ts) — preloads the CPSC recall catalog into DynamoDB (`npm run sync:recalls`). No fake users or pre-built alerts.

## Type system

All domain types in [`src/lib/types.ts`](../src/lib/types.ts):

- Enums: `MatchConfidence`, `Eligibility`, `Severity`, `ActionRequired`, etc.
- Entities: `Product`, `OwnershipEvent`, `RecallEvent`, `UserRecallStatus`
- API responses: `DashboardResponse`, `IngestResponse`, `ShareReport`
- Hero types: `HouseholdSafetyScore`, `RiskFactor`

## Build and scripts

| Script | Command | Purpose |
| ------ | ------- | ------- |
| Dev server | `npm run dev` | Port 3001 |
| Production build | `npm run build` | Next.js static/server build |
| Sync recalls | `npm run sync:recalls` | CPSC catalog → DynamoDB |
| Infra deploy | `npm run infra:deploy` | Terraform apply |
| Infra seed | `npm run infra:seed` | Terraform env + CPSC sync |

## Testing locally against AWS

```bash
source scripts/terraform-env.sh
USE_LOCAL_STORE=false npm run dev
curl -X POST http://localhost:3001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-001","csv":"order_date,title,brand,model,upc,quantity,price,retailer\n2023-05-01,Cosori Dual Blaze Air Fryer,Cosori,Dual Blaze,,1,119.99,Store"}'

curl "http://localhost:3001/api/dashboard?userId=test-user-001"
```

## Extension points (Post-MVP)

| Area | Suggested approach |
| ---- | ------------------ |
| Authentication | Clerk or Auth.js → replace `session.ts` |
| Live recall ingest | EventBridge + Lambda + CPSC RSS |
| Notifications | SES email / SNS SMS on STOP_USE |
| OCR receipts | S3 upload + Textract → ownership events |
| Community verification | New `VerificationEvent` entity on status table |
| Numeric match score | Extend matcher to return 0–100 score bands |
| LLM polish | Optional layer on `recall-explanation.ts` input |

## Code conventions

- **TypeScript strict** throughout
- **Server components** for static pages; **client components** for interactivity
- **Route handlers** for all API endpoints (no separate Express server)
- **Environment-driven** store selection (memory vs DynamoDB)
- **Deterministic matching** — no LLM in critical path for explainability
