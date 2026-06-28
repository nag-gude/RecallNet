# CSV format reference

RecallNet accepts order export CSVs from **any retailer**. Required columns (flexible header names):

| Column | Example | Notes |
| ------ | ------- | ----- |
| `order_date` | `2024-01-15` | Purchase date |
| `title` | `Cosori Air Fryer` | Product name |
| `brand` | `Cosori` | Optional — improves CPSC name search |
| `model` | `Dual Blaze` | Optional |
| `upc` | `810098765432` | **Recommended** — enables exact CPSC UPC lookup |
| `quantity` | `1` | Optional |
| `price` | `119.99` | Optional |
| `retailer` | `Any Store` | Optional — any retailer name |

## Example row

```csv
order_date,title,brand,model,upc,quantity,price,retailer
2024-02-22,Cosori Air Fryer,Cosori,Dual Blaze,810098765432,1,119.99,Online Store
```

Each uploaded product is matched against **live CPSC SaferProducts.gov recall data** — not pre-seeded demo records.

## Finding UPCs

- Product packaging barcode
- Retailer order confirmation emails
- Receipt details

Without a UPC, RecallNet searches CPSC by product/brand name (lower confidence).
