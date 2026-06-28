#!/usr/bin/env bash
# Provision RecallNet AWS infrastructure (DynamoDB + IAM + S3) and optionally sync CPSC recalls.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="${ROOT}/terraform"

cd "$TF_DIR"

if [[ ! -f terraform.tfvars ]]; then
  echo "Creating terraform.tfvars from example..."
  cp terraform.tfvars.example terraform.tfvars
  echo "Edit terraform/terraform.tfvars if needed, then re-run."
fi

echo "==> terraform init"
terraform init

echo "==> terraform plan"
terraform plan -out=tfplan

echo "==> terraform apply"
terraform apply tfplan
rm -f tfplan

echo ""
echo "==> Vercel environment variables (copy to Vercel dashboard):"
terraform output -json vercel_environment_variables | python3 -m json.tool 2>/dev/null || \
  terraform output vercel_environment_variables

echo ""
read -r -p "Sync CPSC recalls into DynamoDB now? [y/N] " SEED
if [[ "$SEED" =~ ^(-y|--yes|y|Y)$ ]]; then
  cd "$ROOT"
  source "${ROOT}/scripts/terraform-env.sh"
  npm run sync:recalls
  echo "CPSC sync complete."
fi

echo ""
terraform output -raw deploy_next_steps
