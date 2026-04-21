terraform {
  required_version = ">= 1.5.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

locals {
  environment         = lower(var.environment)
  registry_clean      = trimspace(regexreplace(var.docker_registry, "/+$", ""))
  registry_prefix     = local.registry_clean != "" ? "${local.registry_clean}/" : ""
  server_image_full   = "${local.registry_prefix}${var.github_username}/marketing-agent-server:${var.image_tag}"
  web_image_full      = "${local.registry_prefix}${var.github_username}/marketing-agent-web:${var.image_tag}"
  postgres_db_name    = var.postgres_db_name != "" ? var.postgres_db_name : "marketing_agent_${local.environment}"
  enable_minio        = contains(["dev", "staging"], local.environment)
  ports = {
    dev = {
      server         = 3003
      web            = 8082
      postgres       = 5434
      minio          = 9000
      minio_console  = 9001
    }
    staging = {
      server         = 3002
      web            = 8081
      postgres       = 5433
      minio          = 9100
      minio_console  = 9101
    }
    prod = {
      server         = 3001
      web            = 8080
      postgres       = 5432
      minio          = null
      minio_console  = null
    }
  }
  s3_endpoint = local.enable_minio ? "http://minio:${local.ports[local.environment].minio}" : ""
}

resource "docker_network" "main" {
  name = "${local.environment}_marketing_agent_network"
}

resource "docker_volume" "postgres_data" {
  name = "${local.environment}_postgres_data"
}

resource "docker_volume" "minio_data" {
  count = local.enable_minio ? 1 : 0
  name  = "${local.environment}_minio_data"
}

resource "docker_image" "postgres" {
  name = var.postgres_image
}

resource "docker_image" "minio" {
  count = local.enable_minio ? 1 : 0
  name  = var.minio_image
}

resource "docker_image" "minio_mc" {
  count = local.enable_minio ? 1 : 0
  name  = var.minio_mc_image
}

resource "docker_image" "server_build" {
  count = var.use_local_build ? 1 : 0
  name  = local.server_image_full

  build {
    context    = "${path.module}/../../server"
    dockerfile = "Dockerfile"
  }
}

resource "docker_image" "server_pull" {
  count = var.use_local_build ? 0 : 1
  name  = local.server_image_full
}

resource "docker_image" "web_build" {
  count = var.use_local_build ? 1 : 0
  name  = local.web_image_full

  build {
    context    = "${path.module}/../../web"
    dockerfile = "Dockerfile"
  }
}

resource "docker_image" "web_pull" {
  count = var.use_local_build ? 0 : 1
  name  = local.web_image_full
}

resource "docker_container" "minio" {
  count = local.enable_minio ? 1 : 0
  name  = "${local.environment}_minio"
  image = docker_image.minio[0].name
  restart = "unless-stopped"

  env = [
    "MINIO_ROOT_USER=${var.minio_root_user}",
    "MINIO_ROOT_PASSWORD=${var.minio_root_password}",
  ]

  command = ["server", "/data", "--console-address", ":${var.minio_console_port}"]
  ports = [
    "${local.ports[local.environment].minio}:9000",
    "${local.ports[local.environment].minio_console}:9001",
  ]
  volumes = ["${docker_volume.minio_data[0].name}:/data"]
  networks_advanced = [{ name = docker_network.main.name }]
}

resource "docker_container" "minio_init" {
  count    = local.enable_minio ? 1 : 0
  name     = "${local.environment}_minio_init"
  image    = docker_image.minio_mc[0].name
  restart  = "no"
  depends_on = [docker_container.minio]

  command = ["/bin/sh", "-c", "mc alias set local http://minio:9000 ${var.minio_root_user} ${var.minio_root_password} && mc mb -p local/${var.minio_bucket} || true && mc anonymous set public local/${var.minio_bucket} || true"]
  networks_advanced = [{ name = docker_network.main.name }]
}

resource "docker_container" "postgres" {
  name    = "${local.environment}_postgres"
  image   = docker_image.postgres.name
  restart = "unless-stopped"

  env = [
    "POSTGRES_USER=${var.postgres_user}",
    "POSTGRES_PASSWORD=${var.database_password}",
    "POSTGRES_DB=${local.postgres_db_name}",
  ]

  ports = ["${local.ports[local.environment].postgres}:5432"]
  volumes = ["${docker_volume.postgres_data.name}:/var/lib/postgresql/data"]
  networks_advanced = [{ name = docker_network.main.name }]
}

resource "docker_container" "server" {
  name    = "${local.environment}_server"
  image   = local.server_image_full
  restart = "unless-stopped"

  env = [
    "DATABASE_URL=postgresql://${var.postgres_user}:${var.database_password}@${docker_container.postgres.name}:5432/${local.postgres_db_name}",
    "NODE_ENV=${var.server_node_env}",
    "PORT=3001",
    "S3_ENDPOINT=${local.s3_endpoint}",
    "S3_ACCESS_KEY=${var.minio_root_user}",
    "S3_SECRET_KEY=${var.minio_root_password}",
    "S3_BUCKET=${var.minio_bucket}",
  ]

  ports = ["${local.ports[local.environment].server}:3001"]
  volumes = ["${path.module}/../../server/logs:/app/logs"]
  networks_advanced = [{ name = docker_network.main.name }]
  depends_on = [docker_container.postgres]
}

resource "docker_container" "web" {
  name    = "${local.environment}_web"
  image   = local.web_image_full
  restart = "unless-stopped"

  ports = ["${local.ports[local.environment].web}:80"]
  volumes = ["${path.module}/../../infra/${local.environment}/network/nginx/default.conf:/etc/nginx/conf.d/default.conf:ro"]
  networks_advanced = [{ name = docker_network.main.name }]
  depends_on = [docker_container.server]
}
