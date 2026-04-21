variable "environment" {
  type        = string
  description = "Deployment environment: dev, staging, or prod."
  default     = "dev"
}

variable "docker_registry" {
  type        = string
  description = "Optional Docker registry prefix for pulled images. Example: ghcr.io"
  default     = ""
}

variable "github_username" {
  type        = string
  description = "GitHub username or Docker registry namespace used for image names."
  default     = "your-username"
}

variable "image_tag" {
  type        = string
  description = "Docker image tag for server and web images."
  default     = "latest"
}

variable "use_local_build" {
  type        = bool
  description = "Build server/web images locally instead of pulling from a registry."
  default     = true
}

variable "postgres_user" {
  type        = string
  description = "PostgreSQL user for the database."
  default     = "postgres"
}

variable "database_password" {
  type        = string
  description = "PostgreSQL password."
  sensitive   = true
  default     = "m1505"
}

variable "postgres_db_name" {
  type        = string
  description = "PostgreSQL database name. If empty, Terraform infers one from the environment."
  default     = ""
}

variable "server_node_env" {
  type        = string
  description = "NODE_ENV value for the server container."
  default     = "development"
}

variable "postgres_image" {
  type        = string
  description = "Docker image used for PostgreSQL."
  default     = "postgres:16"
}

variable "minio_image" {
  type        = string
  description = "Docker image used for MinIO."
  default     = "minio/minio:latest"
}

variable "minio_mc_image" {
  type        = string
  description = "Docker image used for MinIO client initialization."
  default     = "minio/mc:latest"
}

variable "minio_root_user" {
  type        = string
  description = "MinIO root username."
  default     = "minioadmin"
}

variable "minio_root_password" {
  type        = string
  description = "MinIO root password."
  sensitive   = true
  default     = "minioadmin"
}

variable "minio_bucket" {
  type        = string
  description = "MinIO bucket name used by the application."
  default     = "my-bucket"
}
