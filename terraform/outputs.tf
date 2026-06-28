output "aws_region" {
  description = "AWS region."
  value       = var.aws_region
}

output "aws_account_id" {
  description = "AWS account ID."
  value       = data.aws_caller_identity.current.account_id
}

output "dynamodb_table_products" {
  description = "Products table name."
  value       = aws_dynamodb_table.products.name
}

output "dynamodb_table_ownership_events" {
  description = "OwnershipEvents table name."
  value       = aws_dynamodb_table.ownership_events.name
}

output "dynamodb_table_recall_events" {
  description = "RecallEvents table name."
  value       = aws_dynamodb_table.recall_events.name
}

output "dynamodb_table_user_recall_status" {
  description = "UserRecallStatus table name."
  value       = aws_dynamodb_table.user_recall_status.name
}

output "dynamodb_gsi_names" {
  description = "GSI names for hackathon demo / console screenshot."
  value = {
    ProductOwnersIndex  = "ProductOwnersIndex (ownership-events)"
    ProductRecallsIndex = "ProductRecallsIndex (recall-events)"
    ActiveRecallsIndex  = "ActiveRecallsIndex (recall-events)"
  }
}

output "s3_receipts_bucket" {
  description = "S3 bucket for receipt uploads (empty string if disabled)."
  value       = var.create_s3_receipts_bucket ? aws_s3_bucket.receipts[0].bucket : ""
}

output "iam_user_name" {
  description = "IAM user for Vercel (empty if create_iam_user=false)."
  value       = var.create_iam_user ? aws_iam_user.vercel_app[0].name : ""
}

output "iam_access_key_id" {
  description = "AWS access key ID for Vercel environment variables."
  value       = var.create_iam_user ? aws_iam_access_key.vercel_app[0].id : ""
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "AWS secret access key for Vercel environment variables."
  value       = var.create_iam_user ? aws_iam_access_key.vercel_app[0].secret : ""
  sensitive   = true
}

output "vercel_environment_variables" {
  description = "Copy these into Vercel Project → Settings → Environment Variables."
  value = {
    USE_LOCAL_STORE              = "false"
    AWS_REGION                   = var.aws_region
    AWS_ACCESS_KEY_ID            = var.create_iam_user ? aws_iam_access_key.vercel_app[0].id : "<set-manually>"
    AWS_SECRET_ACCESS_KEY          = var.create_iam_user ? aws_iam_access_key.vercel_app[0].secret : "<set-manually>"
    DYNAMODB_PRODUCTS_TABLE      = aws_dynamodb_table.products.name
    DYNAMODB_OWNERSHIP_TABLE     = aws_dynamodb_table.ownership_events.name
    DYNAMODB_RECALLS_TABLE       = aws_dynamodb_table.recall_events.name
    DYNAMODB_STATUS_TABLE        = aws_dynamodb_table.user_recall_status.name
    S3_RECEIPTS_BUCKET           = var.create_s3_receipts_bucket ? aws_s3_bucket.receipts[0].bucket : ""
    NEXT_PUBLIC_APP_URL          = "https://your-app.vercel.app"
  }
  sensitive = true
}

output "deploy_next_steps" {
  description = "Post-apply checklist."
  value       = <<-EOT
    1. Copy vercel_environment_variables into Vercel (Settings → Environment Variables).
    2. Set NEXT_PUBLIC_APP_URL to your Vercel deployment URL.
    3. From project root: USE_LOCAL_STORE=false npm run sync:recalls
    4. Deploy: vercel --prod
    5. Verify: curl https://your-app.vercel.app/api/health
    6. AWS console screenshot: DynamoDB → Tables → ${local.name_prefix}-*
  EOT
}
