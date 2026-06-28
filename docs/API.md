# API Reference

RecallNet exposes a REST API via Next.js Route Handlers under `/api/`. All endpoints return JSON unless noted.

Base URL:

- Local: `http://localhost:3001`
- Production: `https://your-app.vercel.app`

## Health

### `GET /api/health`

Check application and storage connectivity.

**Response 200**

```json
{
  "status": "ok",
  "storage": "memory",
  "timestamp": "2026-06-16T12:00:00.000Z"
}
```

| Field | Values |
| ----- | ------ |
| `status` | `ok` \| `degraded` |
| `storage` | `memory` \| `dynamodb` |

---

## Ingest

### `POST /api/ingest/csv`

Parse Amazon-style order CSV, create ownership events, run matcher.

**Request body**

```json
{
  "userId": "user-abc123",
  "csv": "Title,Order Date,Price,Quantity,UPC\nCosori Air Fryer,2023-05-01,149.99,1,810098765432\n..."
}
```

| Field | Type | Required | Description |
| ----- | ---- | -------- | ----------- |
| `userId` | string | Yes | Session user ID |
| `csv` | string | Yes | Raw CSV content |

**Response 200**

```json
{
  "itemsParsed": 12,
  "productsMatched": 3,
  "recallsFound": 3,
  "eligibleRemedyValueUsd": 150,
  "alerts": [ /* UserRecallStatus[] */ ]
}
```

**Errors**

| Status | Body | Cause |
| ------ | ---- | ----- |
| 400 | `{ "error": "userId and csv are required" }` | Missing fields |
| 400 | `{ "error": "No valid rows in CSV" }` | Empty/invalid CSV |
| 500 | `{ "error": "Ingest failed" }` | Server error |

---

### `POST /api/ingest/text`

Parse free-text product list (one product per line).

**Request body**

```json
{
  "userId": "user-abc123",
  "text": "Cosori Dual Blaze Air Fryer\nBrita Water Pitcher"
}
```

**Response 200** — Same shape as CSV ingest.

---

## Dashboard

### `GET /api/dashboard`

Build dashboard summary, alerts, and product list for a user.

**Query parameters**

| Param | Required | Description |
| ----- | -------- | ----------- |
| `userId` | Yes | User session ID |

**Example**

```
GET /api/dashboard?userId=YOUR_SESSION_ID
```

**Response 200**

```json
{
  "userId": "YOUR_SESSION_ID",
  "summary": {
    "productsOwned": 12,
    "activeRecalls": 3,
    "eligibleRemedyValueUsd": 150,
    "stopUseCount": 2,
    "householdSafetyScore": {
      "total": 90,
      "band": "Critical",
      "factors": [
        { "label": "Fire / stop-use hazard", "points": 45 },
        { "label": "Child product", "points": 30 },
        { "label": "Active eligible recall", "points": 15 }
      ]
    }
  },
  "alerts": [
    {
      "userId": "YOUR_SESSION_ID",
      "recallId": "CPSC-2024-FP-SWING",
      "productId": "PRODUCT#810012345678",
      "productName": "Fisher-Price Infant-to-Toddler Rocker",
      "matchConfidence": "HIGH",
      "matchReason": "UPC exact match",
      "eligibility": "ELIGIBLE",
      "severity": "STOP_USE",
      "remedyType": "REPAIR_KIT",
      "actionRequired": "STOP_USE",
      "claimUrl": "https://www.service.mattel.com/us/recall",
      "sourceUrl": "https://www.saferproducts.gov/Recall/Fisher-Price-Rocker",
      "hazardDescription": "Infants can roll into a side position...",
      "notifiedAt": "2026-06-16T12:00:00.000Z",
      "remedyValueUsd": 0,
      "category": "baby"
    }
  ],
  "products": [
    {
      "productId": "PRODUCT#810012345678",
      "name": "Fisher-Price Infant-to-Toddler Rocker",
      "purchaseDate": "2023-08-15",
      "status": "ACTION_REQUIRED"
    }
  ]
}
```

**Product status values:** `SAFE` | `RECALLED` | `ACTION_REQUIRED` | `EXPIRED`

**Errors**

| Status | Cause |
| ------ | ----- |
| 400 | Missing `userId` |
| 500 | Server error |

---

## Admin (deprecated)

### `GET /api/admin/simulate-recall`

**Deprecated.** Use `GET /api/recalls` instead.

List active recalls from CPSC catalog.

**Response 200**

```json
{
  "recalls": [ /* RecallEvent[] */ ]
}
```

---

### `POST /api/admin/simulate-recall`

**Deprecated.** Use `POST /api/recalls` with `{"notify": true}` instead.

Syncs latest CPSC recalls and fan-outs alerts to product owners via `ProductOwnersIndex` GSI.

**Response 200**

```json
{
  "recallId": "CPSC-26565",
  "title": "CPSC recall sync",
  "ownersNotified": 1,
  "alertsCreated": 1,
  "message": "ProductOwnersIndex fan-out: 1 owner(s) notified after CPSC sync"
}
```

**Errors**

| Status | Cause |
| ------ | ----- |
| 404 | Recall not found |
| 500 | Fan-out failed |

---

## Share Safety Report

### `POST /api/report/generate`

Create a public read-only safety report token.

**Request body**

```json
{
  "userId": "YOUR_SESSION_ID"
}
```

**Response 200**

```json
{
  "token": "abc123def456",
  "url": "http://localhost:3001/report/abc123def456"
}
```

---

### `GET /api/report/[token]`

Fetch a public safety report (no PII — product names and severities only).

**Response 200**

```json
{
  "token": "abc123def456",
  "createdAt": "2026-06-16T12:00:00.000Z",
  "items": [
    {
      "productName": "Fisher-Price Infant-to-Toddler Rocker",
      "severity": "STOP_USE",
      "eligibility": "ELIGIBLE",
      "actionRequired": "STOP_USE"
    }
  ]
}
```

**Errors**

| Status | Cause |
| ------ | ----- |
| 404 | Token not found |

---

## Data types

### UserRecallStatus

| Field | Type | Description |
| ----- | ---- | ----------- |
| `userId` | string | Owner |
| `recallId` | string | Recall identifier |
| `productId` | string | Matched product |
| `productName` | string | Display name |
| `matchConfidence` | `HIGH` \| `MEDIUM` \| `LOW` | Match quality |
| `matchReason` | string | Human-readable match explanation |
| `eligibility` | `ELIGIBLE` \| `EXPIRED` \| `UNKNOWN` | Remedy eligibility |
| `severity` | `STOP_USE` \| `REPAIR` \| `REFUND` \| `INFORMATIONAL` | Recall severity |
| `actionRequired` | `STOP_USE` \| `SUBMIT_CLAIM` \| `REGISTER` \| `NONE` | User action |
| `claimUrl` | string? | Manufacturer remedy page |
| `sourceUrl` | string | Official recall listing |
| `hazardDescription` | string | Hazard narrative |
| `remedyValueUsd` | number? | Dollar value if eligible |
| `category` | string | Product category (`baby`, `kitchen`, etc.) |

### RecallEvent

| Field | Type | Description |
| ----- | ---- | ----------- |
| `recallId` | string | Unique recall ID |
| `publishedAt` | ISO8601 | Publication date |
| `productIds` | string[] | Affected products |
| `severity` | Severity | Recall severity |
| `agency` | `CPSC` \| `FDA` \| `NHTSA` \| `MANUFACTURER` | Issuing agency |
| `title` | string | Recall title |
| `hazardDescription` | string | Official hazard text |
| `remedyType` | `REPLACEMENT` \| `REFUND` \| `REPAIR_KIT` \| `DISPOSE` | Remedy type |
| `eligibilityRules` | object | Date range, remedy value |
| `sourceUrl` | string | Official source link |
| `claimUrl` | string? | Claim submission URL |
| `status` | `ACTIVE` \| `RESOLVED` | Recall status |

---

## Example curl commands

```bash
# Health check
curl http://localhost:3001/api/health

# Dashboard (after upload)
curl "http://localhost:3001/api/dashboard?userId=test-user-001"

# CSV ingest
curl -X POST http://localhost:3001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","csv":"Title,Order Date,Price,Quantity,UPC\nCosori Air Fryer,2023-05-01,149.99,1,810098765432"}'

# Simulate recall fan-out
curl -X POST http://localhost:3001/api/admin/simulate-recall \
  -H "Content-Type: application/json" \
  -d '{}'

# Generate share report
curl -X POST http://localhost:3001/api/report/generate \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user-001"}'
```

---

## Error handling

All endpoints follow consistent error patterns:

- **400** — Client error (missing/invalid input)
- **404** — Resource not found
- **500** — Unhandled server error

Stack traces and AWS internals are never exposed to clients.
