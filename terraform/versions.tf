terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.37.0"
    }
  }

  # Uncomment after creating the S3 bucket + DynamoDB lock table (see README).
  # backend "s3" {
  #   bucket         = "recallnet-terraform-state"
  #   key            = "recallnet/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  #   dynamodb_table = "recallnet-terraform-locks"
  # }
}
