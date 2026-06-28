# ---------------------------------------------------------------------------
# Products — canonical catalog (hash key: productId)
# Access: GetItem by productId; Query UpcIndex for UPC exact match
# GSI UpcIndex: upc → product (sparse — only items with UPC populated)
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "products" {
  name         = local.table_products
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "productId"

  attribute {
    name = "productId"
    type = "S"
  }

  attribute {
    name = "upc"
    type = "S"
  }

  global_secondary_index {
    name = "UpcIndex"
    key_schema {
      attribute_name = "upc"
      key_type       = "HASH"
    }
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name        = local.table_products
    AccessLayer = "catalog"
    GSI         = "UpcIndex"
  })
}

# ---------------------------------------------------------------------------
# OwnershipEvents — append-only purchase stream
# PK: USER#<userId>  SK: EVENT#<timestamp>#<eventId>
# GSI ProductOwnersIndex: GSI1PK=productId → GSI1SK=USER#<userId>
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "ownership_events" {
  name         = local.table_ownership
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name = "ProductOwnersIndex"
    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name        = local.table_ownership
    AccessLayer = "ownership-stream"
    GSI         = "ProductOwnersIndex"
  })
}

# ---------------------------------------------------------------------------
# RecallEvents — immutable recall notices
# PK: RECALL#<recallId>  SK: EVENT#<publishedAt>
# GSI ProductRecallsIndex: GSI1PK=productId, GSI1SK=publishedAt
# GSI ActiveRecallsIndex:  GSI2PK=status,     GSI2SK=publishedAt
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "recall_events" {
  name         = local.table_recalls
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  global_secondary_index {
    name = "ProductRecallsIndex"
    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
  }

  global_secondary_index {
    name = "ActiveRecallsIndex"
    key_schema {
      attribute_name = "GSI2PK"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "GSI2SK"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name        = local.table_recalls
    AccessLayer = "recall-stream"
    GSI         = "ProductRecallsIndex ActiveRecallsIndex"
  })
}

# ---------------------------------------------------------------------------
# UserRecallStatus — materialized alerts + share reports
# PK: USER#<userId> | REPORT#<token>   SK: RECALL#<recallId> | META
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "user_recall_status" {
  name         = local.table_status
  billing_mode = var.dynamodb_billing_mode
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  deletion_protection_enabled = var.enable_deletion_protection

  tags = merge(local.common_tags, {
    Name        = local.table_status
    AccessLayer = "alert-projection"
  })
}
