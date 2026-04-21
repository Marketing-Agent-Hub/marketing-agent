output "network_name" {
  description = "Docker network created for the Terraform deployment."
  value       = docker_network.main.name
}

output "postgres_container_name" {
  description = "PostgreSQL container name."
  value       = docker_container.postgres.name
}

output "server_container_name" {
  description = "Server container name."
  value       = docker_container.server.name
}

output "web_container_name" {
  description = "Web container name."
  value       = docker_container.web.name
}

output "minio_container_name" {
  description = "MinIO container name, if enabled for dev/staging."
  value       = local.enable_minio ? docker_container.minio[0].name : "disabled"
}
