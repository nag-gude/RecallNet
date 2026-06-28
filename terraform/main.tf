provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(
      {
        Project     = var.project_name
        Environment = var.environment
        ManagedBy   = "terraform"
        Application = "RecallNet"
      },
      var.tags,
    )
  }
}

data "aws_caller_identity" "current" {}

locals {
  # Table names match src/lib/db/dynamodb.ts defaults (recallnet-*)
  name_prefix = var.project_name

  table_products  = "${local.name_prefix}-products"
  table_ownership = "${local.name_prefix}-ownership-events"
  table_recalls   = "${local.name_prefix}-recall-events"
  table_status    = "${local.name_prefix}-user-recall-status"

  common_tags = merge(
    {
      Project     = var.project_name
      Environment = var.environment
    },
    var.tags,
  )
}
