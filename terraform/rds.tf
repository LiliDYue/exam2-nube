resource "aws_db_instance" "db" {
  allocated_storage    = 20
  engine               = "postgres"
  instance_class       = "db.t3.micro"
  username             = "postgres"
  password             = "password123"
  skip_final_snapshot  = true
}