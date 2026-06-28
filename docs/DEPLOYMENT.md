# Deployment Guide

This guide covers local development, AWS infrastructure (Terraform), Vercel deployment, and production verification for RecallNet.

## Prerequisites

| Tool | Version | Purpose |
| ---- | ------- | ------- |
| Node.js | 18+ | Next.js app |
| npm | 9+ | Package management |
| AWS CLI | 2.x | AWS authentication |
| Terraform | ≥ 1.5 | Infrastructure provisioning |
| Vercel CLI | latest (optional) | Frontend deployment |

## Deployment overview

RecallNet uses a **split deployment model** aligned with H0 hackathon requirements:

| Layer | Platform | Provisioned by |
| ----- | -------- | ------------ |
| Frontend + API | Vercel | `vercel deploy` |
| Database | AWS DynamoDB | Terraform |
| Object storage (optional) | AWS S3 | Terraform |
| IAM credentials | AWS IAM | Terraform |

```
┌──────────────┐     HTTPS      ┌──────────────┐     AWS SDK     ┌──────────────┐
│   Browser    │ ─────────────▶ │    Vercel    │ ──────────────▶ │  DynamoDB    │
│              │                │  Next.js API │   IAM user      │  4 tables    │
└──────────────┘                └──────────────┘                 └──────────────┘
                                       ▲
                                       │ terraform apply
                                ┌──────┴───────┐
                                │  Terraform   │
                                └──────────────┘
```

---

## 1. Local development

Local dev uses an **in-memory store** — no AWS account required.

```bash
cd RecallNet
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3001

### Default local environment

```env
USE_LOCAL_STORE=true
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Verify local health

```bash
curl http://localhost:3001/api/health
```

Expected response:

```json
{
  "status": "ok",
  "storage": "memory",
  "timestamp": "2026-06-16T..."
}
```

### Quick test paths

| URL | Description |
| --- | ----------- |
| `/upload` | CSV ingest with live CPSC video demo CSV loader |
| `/dashboard` | Alerts after upload (session-based) |
| `/graph` | Safety Graph visualization |
| `/recalls` | Live CPSC feed + sync |

---

## 2. AWS infrastructure (Terraform)

### 2.1 Configure AWS credentials

```bash
aws configure
# AWS Access Key ID: ...
# AWS Secret Access Key: ...
# Default region: us-east-1
```

Or export environment variables:

```bash
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1
```

### 2.2 Provision resources

**One-command deploy:**

```bash
npm run infra:deploy
```

This runs `terraform init`, `plan`, `apply`, and optionally syncs CPSC recalls.

**Manual step-by-step:**

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars if needed (region, tags, etc.)

terraform init
terraform plan
terraform apply
```

### 2.3 Resources created

| Resource | Name pattern | Purpose |
| -------- | ------------ | ------- |
| DynamoDB table | `recallnet-products` | Product catalog |
| DynamoDB table | `recallnet-ownership-events` | Purchase events + `ProductOwnersIndex` GSI |
| DynamoDB table | `recallnet-recall-events` | Recall events + 2 GSIs |
| DynamoDB table | `recallnet-user-recall-status` | Materialized alerts |
| IAM user | `recallnet-dev-vercel-app` | Vercel API credentials |
| IAM policy | Least-privilege DynamoDB (+ S3) | Attached to IAM user |
| S3 bucket | `recallnet-dev-receipts-<account-id>` | Receipt uploads (optional) |

**Estimated cost:** ~$0–5/month on PAY_PER_REQUEST with hackathon traffic.

### 2.4 Terraform outputs

```bash
cd terraform
terraform output                          # All outputs
terraform output dynamodb_table_products  # Single value
terraform output -json vercel_environment_variables  # For Vercel setup
```

Key outputs:

| Output | Use |
| ------ | --- |
| `iam_access_key_id` | Vercel env var (sensitive) |
| `iam_secret_access_key` | Vercel env var (sensitive) |
| `dynamodb_table_*` | Table name env vars |
| `vercel_environment_variables` | Complete env var map |
| `deploy_next_steps` | Post-apply checklist |

### 2.5 Seed DynamoDB

After Terraform apply:

```bash
# Load AWS creds from Terraform outputs
source scripts/terraform-env.sh

# Sync CPSC recall catalog into DynamoDB
npm run sync:recalls

# Or combined:
npm run infra:seed
```

To persist env vars locally (gitignored):

```bash
source scripts/terraform-env.sh --write
# Creates .env.aws — do not commit
```

### 2.6 Verify AWS connectivity

```bash
source scripts/terraform-env.sh
USE_LOCAL_STORE=false npm run dev
curl http://localhost:3001/api/health
```

Expected:

```json
{
  "status": "ok",
  "storage": "dynamodb",
  "timestamp": "..."
}
```

**AWS Console screenshot:** DynamoDB → Tables → `recallnet-*` — include in hackathon submission.

### 2.7 Terraform variables

Edit `terraform/terraform.tfvars`:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `aws_region` | `us-east-1` | AWS region |
| `project_name` | `recallnet` | Table name prefix |
| `environment` | `dev` | Environment label (tags) |
| `dynamodb_billing_mode` | `PAY_PER_REQUEST` | On-demand billing |
| `create_iam_user` | `true` | Create Vercel IAM user |
| `create_s3_receipts_bucket` | `true` | S3 for receipts |
| `enable_deletion_protection` | `false` | Set `true` for production |
| `enable_point_in_time_recovery` | `false` | Set `true` for production |

### 2.8 Remote state (optional)

For team/production use, uncomment the `backend "s3"` block in `terraform/versions.tf`:

```bash
aws s3 mb s3://recallnet-terraform-state --region us-east-1

aws dynamodb create-table \
  --table-name recallnet-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Then re-run `terraform init -migrate-state`.

### 2.9 Teardown

```bash
npm run infra:destroy
# or: cd terraform && terraform destroy
```

⚠️ Deletes all DynamoDB data and IAM credentials.

---

## 3. Vercel deployment

### 3.1 Create Vercel project

```bash
npm i -g vercel   # if not installed
vercel login
vercel link       # from project root
```

Or connect the GitHub repo in the Vercel dashboard.

### 3.2 Environment variables

Set in **Vercel → Project → Settings → Environment Variables** (Production + Preview):

| Variable | Value | Notes |
| -------- | ----- | ----- |
| `USE_LOCAL_STORE` | `false` | Required for production |
| `AWS_REGION` | `us-east-1` | Match Terraform region |
| `AWS_ACCESS_KEY_ID` | From `terraform output` | Sensitive |
| `AWS_SECRET_ACCESS_KEY` | From `terraform output` | Sensitive |
| `DYNAMODB_PRODUCTS_TABLE` | `recallnet-products` | Or terraform output |
| `DYNAMODB_OWNERSHIP_TABLE` | `recallnet-ownership-events` | |
| `DYNAMODB_RECALLS_TABLE` | `recallnet-recall-events` | |
| `DYNAMODB_STATUS_TABLE` | `recallnet-user-recall-status` | |
| `S3_RECEIPTS_BUCKET` | From terraform output | Optional |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your deployment URL |

Quick copy:

```bash
cd terraform
terraform output -json vercel_environment_variables | python3 -m json.tool
```

### 3.3 Deploy

```bash
vercel --prod
```

Or push to the connected Git branch for automatic deployment.

### 3.4 Verify production

```bash
curl https://your-app.vercel.app/api/health
```

Expected: `"storage": "dynamodb"`, `"status": "ok"`.

Test live upload flow:

```
https://your-app.vercel.app/upload
```

Load the video demo CSV, upload, then open `/dashboard`.

### 3.5 Build settings

Vercel auto-detects Next.js. Defaults work:

| Setting | Value |
| ------- | ----- |
| Framework | Next.js |
| Build command | `npm run build` |
| Output directory | `.next` |
| Install command | `npm install` |
| Node.js version | 18.x or 20.x |

---

## 4. End-to-end deployment checklist

Use this for hackathon submission readiness:

- [ ] `terraform apply` succeeded — 4 DynamoDB tables visible in AWS console
- [ ] GSIs visible: `ProductOwnersIndex`, `ProductRecallsIndex`, `ActiveRecallsIndex`
- [ ] `npm run infra:seed` completed — CPSC catalog synced
- [ ] Vercel env vars set — `USE_LOCAL_STORE=false`
- [ ] `vercel --prod` deployed
- [ ] `/api/health` returns `"storage": "dynamodb"`
- [ ] `/upload` → video demo CSV → `/dashboard` shows live CPSC alerts
- [ ] `/graph` renders Safety Graph after upload
- [ ] `/recalls` sync returns live CPSC feed
- [ ] AWS console screenshot captured for submission
- [ ] v0.app prompt screenshot in Devpost gallery

---

## 5. Troubleshooting

### Health returns `"storage": "memory"` in production

- Check `USE_LOCAL_STORE` is `false` in Vercel env vars
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set
- Redeploy after changing env vars

### Health returns `"status": "degraded"`

- DynamoDB tables may not exist — run `terraform apply`
- IAM user may lack permissions — check policy attachment
- Table names may mismatch — compare Vercel env vars with `terraform output`
- Region mismatch — ensure `AWS_REGION` matches Terraform region

### Seed script fails

```bash
source scripts/terraform-env.sh
echo $DYNAMODB_PRODUCTS_TABLE   # Should print recallnet-products
aws dynamodb describe-table --table-name recallnet-products
npm run seed
```

### Terraform apply fails: table already exists

Tables may have been created manually. Either import them:

```bash
terraform import aws_dynamodb_table.products recallnet-products
```

Or destroy existing tables and re-apply (data loss).

### Upload works locally but not on Vercel

- Check Vercel function logs for DynamoDB errors
- Verify IAM policy includes all 4 table ARNs and GSI index ARNs
- Cold start + DynamoDB latency — upload should still complete in < 5s

### Upload returns 0 alerts for known recalled product

- Verify brand/name matches CPSC listing (e.g. `Cosori` not generic "Air Fryer")
- Try UPC `628078802274` (Arizer Solo III) for exact match
- Re-sync CPSC catalog: `npm run infra:seed`

---

## 6. Environment variable reference

| Variable | Required | Default | Description |
| -------- | -------- | ------- | ----------- |
| `USE_LOCAL_STORE` | No | auto-detect | `true` = in-memory; `false` = DynamoDB |
| `AWS_REGION` | Prod | `us-east-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | Prod | — | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Prod | — | IAM secret key |
| `DYNAMODB_PRODUCTS_TABLE` | No | `recallnet-products` | Products table |
| `DYNAMODB_OWNERSHIP_TABLE` | No | `recallnet-ownership-events` | Ownership events |
| `DYNAMODB_RECALLS_TABLE` | No | `recallnet-recall-events` | Recall events |
| `DYNAMODB_STATUS_TABLE` | No | `recallnet-user-recall-status` | Alert projection |
| `S3_RECEIPTS_BUCKET` | No | — | S3 bucket for receipts |
| `NEXT_PUBLIC_APP_URL` | Yes | — | Public URL for share reports |

See [`.env.example`](../.env.example) for the full template.
