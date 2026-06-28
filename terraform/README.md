# RecallNet — AWS Infrastructure (Terraform)

Provisions the **Amazon DynamoDB** backend for RecallNet (H0 hackathon stack: **Vercel + DynamoDB**).

> **Full deployment guide:** [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)  
> **Architecture details:** [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)

## What gets created

| Resource | Purpose |
| -------- | ------- |
| 4× DynamoDB tables | Products, OwnershipEvents, RecallEvents, UserRecallStatus |
| 3× GSIs | `ProductOwnersIndex`, `ProductRecallsIndex`, `ActiveRecallsIndex` |
| IAM user + policy | Least-privilege access for Vercel API routes |
| S3 bucket (optional) | Receipt image uploads (stretch goal) |

**Estimated cost (hackathon demo):** ~$0–5/month on PAY_PER_REQUEST with light traffic.

## Prerequisites

1. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html) configured:
   ```bash
   aws configure
   # or: export AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
   ```
2. [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5
3. Node.js 18+ (for seed script)

## Quick deploy

From project root:

```bash
chmod +x scripts/deploy-aws.sh scripts/terraform-env.sh
npm run infra:deploy
```

Or step by step:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

## Wire up Vercel

After `terraform apply`, copy environment variables:

```bash
cd terraform
terraform output -json vercel_environment_variables
```

Set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Source |
| -------- | ------ |
| `USE_LOCAL_STORE` | `false` |
| `AWS_REGION` | terraform output |
| `AWS_ACCESS_KEY_ID` | terraform output (sensitive) |
| `AWS_SECRET_ACCESS_KEY` | terraform output (sensitive) |
| `DYNAMODB_*_TABLE` | terraform outputs |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL |

Redeploy Vercel after setting env vars.

## Sync CPSC recall catalog

```bash
# Load AWS creds from Terraform outputs, then sync
source scripts/terraform-env.sh
npm run sync:recalls

# Or write .env.aws for reference (gitignored)
source scripts/terraform-env.sh --write
```

## Verify

```bash
# Local against AWS (after sourcing terraform-env.sh)
curl http://localhost:3001/api/health
# → {"status":"ok","storage":"dynamodb",...}

# Production
curl https://your-app.vercel.app/api/health
```

AWS Console → DynamoDB → Tables → `recallnet-*` — screenshot for hackathon submission.

## Table schema (matches application code)

```
recallnet-products              hash: productId
recallnet-ownership-events      hash: PK, range: SK
  └ GSI ProductOwnersIndex      hash: GSI1PK, range: GSI1SK
recallnet-recall-events         hash: PK, range: SK
  └ GSI ProductRecallsIndex     hash: GSI1PK, range: GSI1SK
  └ GSI ActiveRecallsIndex      hash: GSI2PK, range: GSI2SK
recallnet-user-recall-status    hash: PK, range: SK
```

See [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for access patterns.

## Remote state (optional, production)

Uncomment the `backend "s3"` block in `versions.tf` and create:

```bash
aws s3 mb s3://recallnet-terraform-state --region us-east-1
aws dynamodb create-table \
  --table-name recallnet-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

## Teardown

```bash
cd terraform
terraform destroy
```

⚠️ This deletes all DynamoDB data. Export seed script output first if needed.

## Variables

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `aws_region` | `us-east-1` | AWS region |
| `project_name` | `recallnet` | Table name prefix |
| `dynamodb_billing_mode` | `PAY_PER_REQUEST` | On-demand billing |
| `create_iam_user` | `true` | IAM user for Vercel |
| `create_s3_receipts_bucket` | `true` | S3 for receipts |
| `enable_deletion_protection` | `false` | Set `true` for prod |

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────┐
│  Vercel         │  HTTPS  │  AWS (Terraform-managed)         │
│  Next.js API    │────────▶│  DynamoDB (4 tables + 4 GSIs)  │
│  Route Handlers │  IAM    │  S3 (receipts, optional)         │
└─────────────────┘         └──────────────────────────────────┘
```

Frontend stays on Vercel; Terraform provisions the AWS data plane per H0 requirements.
