# IAM user for Vercel serverless functions (Next.js API routes)
resource "aws_iam_user" "vercel_app" {
  count = var.create_iam_user ? 1 : 0
  name  = "${local.name_prefix}-vercel-app"

  tags = merge(local.common_tags, {
    Purpose = "vercel-api-dynamodb"
  })
}

resource "aws_iam_access_key" "vercel_app" {
  count = var.create_iam_user ? 1 : 0
  user  = aws_iam_user.vercel_app[0].name
}

data "aws_iam_policy_document" "vercel_app" {
  statement {
    sid    = "DynamoDBTables"
    effect = "Allow"
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem",
      "dynamodb:DescribeTable",
    ]
    resources = [
      aws_dynamodb_table.products.arn,
      "${aws_dynamodb_table.products.arn}/index/*",
      aws_dynamodb_table.ownership_events.arn,
      "${aws_dynamodb_table.ownership_events.arn}/index/*",
      aws_dynamodb_table.recall_events.arn,
      "${aws_dynamodb_table.recall_events.arn}/index/*",
      aws_dynamodb_table.user_recall_status.arn,
    ]
  }

  dynamic "statement" {
    for_each = var.create_s3_receipts_bucket ? [1] : []
    content {
      sid    = "S3Receipts"
      effect = "Allow"
      actions = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
      ]
      resources = ["${aws_s3_bucket.receipts[0].arn}/*"]
    }
  }
}

resource "aws_iam_policy" "vercel_app" {
  count  = var.create_iam_user ? 1 : 0
  name   = "${local.name_prefix}-vercel-app"
  policy = data.aws_iam_policy_document.vercel_app.json

  tags = local.common_tags
}

resource "aws_iam_user_policy_attachment" "vercel_app" {
  count      = var.create_iam_user ? 1 : 0
  user       = aws_iam_user.vercel_app[0].name
  policy_arn = aws_iam_policy.vercel_app[0].arn
}
