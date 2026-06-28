resource "aws_s3_bucket" "receipts" {
  count  = var.create_s3_receipts_bucket ? 1 : 0
  bucket = "${local.name_prefix}-receipts-${data.aws_caller_identity.current.account_id}"

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-receipts"
    Purpose = "receipt-uploads"
  })
}

resource "aws_s3_bucket_public_access_block" "receipts" {
  count  = var.create_s3_receipts_bucket ? 1 : 0
  bucket = aws_s3_bucket.receipts[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "receipts" {
  count  = var.create_s3_receipts_bucket ? 1 : 0
  bucket = aws_s3_bucket.receipts[0].id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "receipts" {
  count  = var.create_s3_receipts_bucket ? 1 : 0
  bucket = aws_s3_bucket.receipts[0].id

  rule {
    id     = "expire-old-receipts"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}
