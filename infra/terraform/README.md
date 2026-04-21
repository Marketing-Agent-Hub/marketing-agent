# Terraform IaC for Marketing Agent

This Terraform configuration codifies the existing Docker Compose deployment of the Marketing Agent project.
It supports `dev`, `staging`, and `prod` environments and can build local images or pull remote images from a registry.

## Requirements

- Docker Desktop installed and running
- Terraform 1.5 or newer
- Optional: credentials for a Docker registry if using remote images

## Usage

1. Change to the Terraform folder:

```bash
cd infra/terraform
```

2. Initialize Terraform:

```bash
terraform init
```

3. Apply for a chosen environment (example for dev):

```bash
terraform apply -var="environment=dev" -var="use_local_build=true"
```

4. For staging with remote images:

```bash
terraform apply \
  -var="environment=staging" \
  -var="use_local_build=false" \
  -var="docker_registry=ghcr.io" \
  -var="github_username=your-username" \
  -var="image_tag=latest"
```

5. For production:

```bash
terraform apply \
  -var="environment=prod" \
  -var="use_local_build=false" \
  -var="docker_registry=ghcr.io" \
  -var="github_username=your-username" \
  -var="image_tag=latest"
```

## Notes

- `prod` uses the same Docker stack as `docker-compose.prod.yml` but via Terraform.
- `dev` and `staging` create a MinIO container and initialize a bucket, matching the Compose files.
- The configuration mounts the local `server/logs` directory and the correct Nginx config from `infra/{env}/network/nginx/default.conf`.

## Customization

If you want to override defaults, create a local `terraform.tfvars` file in `infra/terraform` with values like:

```hcl
environment = "dev"
use_local_build = true
github_username = "your-username"
image_tag = "latest"
```
