variable "aws_region" {
  type        = string
  description = "AWS region for all RecallNet resources."
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Short project prefix used in resource names."
  default     = "recallnet"
}

variable "environment" {
  type        = string
  description = "Deployment environment label (dev, staging, prod)."
  default     = "dev"
}

variable "dynamodb_billing_mode" {
  type        = string
  description = "DynamoDB billing mode: PAY_PER_REQUEST or PROVISIONED."
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.dynamodb_billing_mode)
    error_message = "dynamodb_billing_mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "enable_point_in_time_recovery" {
  type        = bool
  description = "Enable DynamoDB PITR (recommended for production)."
  default     = false
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Prevent accidental table deletion."
  default     = false
}

variable "create_iam_user" {
  type        = bool
  description = "Create an IAM user with DynamoDB (+ optional S3) access for Vercel."
  default     = true
}

variable "create_s3_receipts_bucket" {
  type        = bool
  description = "Create S3 bucket for receipt image uploads (stretch goal)."
  default     = true
}

variable "vercel_team_id" {
  type        = string
  description = "Optional Vercel team ID for documentation output only."
  default     = ""
}

variable "tags" {
  type        = map(string)
  description = "Additional tags applied to all resources."
  default     = {}
}
