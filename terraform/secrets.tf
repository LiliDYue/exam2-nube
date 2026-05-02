resource "aws_secretsmanager_secret" "app" {
  name = "app-secrets"
}

resource "aws_secretsmanager_secret_version" "app_v" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    SQS_URL  = aws_sqs_queue.queue.id
    BUCKET   = aws_s3_bucket.bucket.bucket
    TOPIC    = aws_sns_topic.topic.arn
    DB_HOST  = aws_db_instance.db.address
  })
}