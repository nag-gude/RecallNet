# Testing Guide

Copy-paste examples for testing RecallNet against **live CPSC SaferProducts.gov data**.

**Prerequisites:** `npm run dev` → http://localhost:3001

---

## Quick UI test (5 minutes)

1. Open `/upload`
2. Choose a tab:
   - **Scan barcode** — camera + UPC lookup
   - **Enter manually** — product name / brand / UPC
   - **Bulk CSV** — paste `seed/test-*.csv`
3. Click **Check for recalls**
4. Check `/dashboard` and `/graph`

### Scan tab (camera)

- Allow camera permission when prompted
- Point at a product UPC barcode, or type UPC in the manual field below the viewfinder
- After scan, optionally add product name → **Check this product for recalls**
- Test UPC: `628078802274` (Arizer Solo III — live CPSC recall)

### Manual tab

- Product name: `Cosori Dual Blaze Air Fryer`
- Brand: `Cosori`
- Leave UPC empty for name-based CPSC search

---

## Test CSV files

| File | Expected result |
| ---- | ---------------- |
| [`seed/test-upc-match.csv`](../seed/test-upc-match.csv) | **1 alert** — Arizer Solo III (UPC `628078802274`, fire/burn hazard) |
| [`seed/test-name-match.csv`](../seed/test-name-match.csv) | **2–3 alerts** — Cosori air fryer, BABESIDE doll, GOPO teething toy (name search) |
| [`seed/test-no-recalls.csv`](../seed/test-no-recalls.csv) | **0 alerts** — generic products with no CPSC matches |
| [`seed/video-demo.csv`](../seed/video-demo.csv) | **3 alerts** — live CPSC video demo (Cosori + Arizer + BABESIDE) |

---

## Example 1: UPC exact match (highest confidence)

Paste at `/upload`:

```csv
order_date,title,brand,model,upc,quantity,price,retailer
2025-06-01,Arizer Solo III Portable Vaporizer,Arizer,Solo III,628078802274,1,299.99,Wellness Supply Co
```

**Expected:**
- Dashboard shows **1 active recall**
- Match confidence: **HIGH**
- Hazard text should mention **vaporizer / fire / burn** — not unrelated products (CPSC sometimes has corrupted `Hazards[]` fields; RecallNet validates and falls back to `Description`)
- Product name: **Arizer Solo III Portable Vaporizer** (from your CSV title, not duplicated brand)

---

## Example 2: Product name match (no UPC)

```csv
order_date,title,brand,model,upc,quantity,price,retailer
2023-05-01,Cosori Dual Blaze Air Fryer,Cosori,Dual Blaze,,1,119.99,My Store
```

**Expected:**
- **1 alert** — *Two Million COSORI® Air Fryers Recalled* (fire/burn)
- Match confidence: **MEDIUM** (name-based CPSC search)
- Recall Explanation modal with hazard text from CPSC

---

## Example 3: Child product recall (baby category)

```csv
order_date,title,brand,model,upc,quantity,price,retailer
2025-07-01,BABESIDE Doll and Stroller Playset,BABESIDE,Doll Stroller,,1,40.00,Online Store
```

**Expected:**
- **STOP USE** banner (choking hazard)
- Household Safety Score elevated (child product factor)
- Category: baby-related

---

## Example 4: Mixed cart (recalled + safe items)

Use [`seed/test-name-match.csv`](../seed/test-name-match.csv) — 3 recalled products + 1 safe desk lamp.

**Expected:**
- Multiple alerts sorted by severity (STOP USE first)
- Product list shows mix of `ACTION_REQUIRED` / `RECALLED` / `SAFE`
- Safety Graph tree with multiple recall branches

---

## Example 5: No recalls (negative test)

```csv
order_date,title,brand,model,upc,quantity,price,retailer
2024-05-01,Generic AA Batteries,,,,1,8.99,Local Store
2024-08-12,Plain White T-Shirts,,,,1,19.99,Clothing Store
```

**Expected:**
- Dashboard: *No recalls matched your products against live CPSC data*
- Household Safety Score: **0/100 Low**

---

## API testing (curl)

Replace `YOUR_USER_ID` with any UUID (or use one from browser localStorage key `recallnet_session_id`).

### Health check

```bash
curl http://localhost:3001/api/health
```

Expected:
```json
{
  "status": "ok",
  "storage": "memory",
  "recallSource": "cpsc.gov",
  "recallsInCatalog": 0
}
```

After first request, `recallsInCatalog` may increase (CPSC preload).

### Upload single product (manual / barcode)

```bash
curl -X POST http://localhost:3001/api/ingest/product \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "source": "MANUAL",
    "product": {
      "title": "Cosori Dual Blaze Air Fryer",
      "brand": "Cosori",
      "orderDate": "2023-05-01"
    }
  }'
```

Barcode scan (UPC only):

```bash
curl -X POST http://localhost:3001/api/ingest/product \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "source": "BARCODE_SCAN",
    "product": {
      "title": "Arizer Solo III",
      "upc": "628078802274",
      "orderDate": "2025-06-01"
    }
  }'
```

### Upload CSV

```bash
curl -X POST http://localhost:3001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-001",
    "csv": "order_date,title,brand,model,upc,quantity,price,retailer\n2023-05-01,Cosori Dual Blaze Air Fryer,Cosori,Dual Blaze,,1,119.99,Store"
  }'
```

Expected: `"recallsFound": 1` (or more if CPSC returns related records).

### Dashboard

```bash
curl "http://localhost:3001/api/dashboard?userId=test-user-001"
```

Check `summary.activeRecalls`, `alerts[]`, `householdSafetyScore`.

### Live recall feed

```bash
curl http://localhost:3001/api/recalls
```

Expected: `"source": "cpsc.gov"`, `"count": N`, `"recalls": [...]`

### Sync latest recalls + fan-out

```bash
# 1. Upload a product first (see above)
# 2. Sync
curl -X POST http://localhost:3001/api/recalls \
  -H "Content-Type: application/json" \
  -d '{"notify": true}'
```

Expected: `"message": "Recall catalog up to date..."` or `"Synced N new recall(s)..."`

---

## End-to-end fan-out test

Tests **ProductOwnersIndex** GSI — new recall notifies existing owners.

```bash
USER=test-fanout-$(date +%s)

# Step 1: User owns a Cosori air fryer
curl -s -X POST http://localhost:3001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USER\",\"csv\":\"order_date,title,brand,model,upc,quantity,price,retailer\\n2023-01-01,Cosori Air Fryer,Cosori,Dual Blaze,,1,99.99,Store\"}"

# Step 2: Confirm alert exists
curl -s "http://localhost:3001/api/dashboard?userId=$USER" | python3 -m json.tool | head -30

# Step 3: Sync CPSC (may notify if new recalls published since catalog load)
curl -s -X POST http://localhost:3001/api/recalls \
  -H "Content-Type: application/json" \
  -d '{"notify": true}'
```

---

## Real CPSC products for manual testing

Verified against SaferProducts.gov API (June 2026):

| Product | Search method | CPSC recall |
| ------- | ------------- | ----------- |
| Arizer Solo III Vaporizer | UPC `628078802274` | Recall #26565 — fire/burn |
| Cosori Air Fryer | Brand/name `Cosori` | 2M units — fire/burn |
| BABESIDE Doll & Stroller | Name `BABESIDE` | Recall #26561 — choking |
| GOPO Teething Toys | Name `GOPO` | Recall #26562 — choking |
| Michley Children Pajamas | Name `Michley` | Recall #26567 — burn hazard |

---

## Troubleshooting

| Issue | Cause | Fix |
| ----- | ----- | --- |
| 0 recalls for known product | Name too generic or typo | Use brand from CPSC title (e.g. `Cosori` not `Air Fryer`) |
| Upload slow (>10s) | Live CPSC API per line item | Normal for multi-item CSV; test with 1–2 rows first |
| `recallsInCatalog: 0` after health | Catalog not yet loaded | Wait for first `/upload` or call `POST /api/recalls` |
| CPSC API timeout | Network / CPSC downtime | Retry; check https://www.saferproducts.gov/ |

---

## Production testing

After Vercel deploy:

```bash
curl https://recall-net.vercel.app/api/health
# storage should be "dynamodb"

curl -X POST https://recall-net.vercel.app/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{"userId":"prod-test-1","csv":"order_date,title,brand,model,upc,quantity,price,retailer\n2023-05-01,Cosori Air Fryer,Cosori,Dual Blaze,,1,99.99,Store"}'
```

Then open `https://recall-net.vercel.app/dashboard?userId=prod-test-1`
