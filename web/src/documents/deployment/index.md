---
title: Deployment Overview
description: Overview of deployment options for Open Campus Vietnam RSS Bot
order: 1
---

# Deployment Overview

This section covers all deployment options and configurations for the Open Campus Vietnam RSS Bot.

## Deployment Methods

The system can be deployed in multiple ways:

### 🐳 Docker Deployment (Recommended)
- **Best for**: Production environments, VPS servers
- **Tools**: Docker + Docker Compose
- **Complexity**: Low
- **Guide**: [Docker Guide](./docker)

### 🖥️ VPS Deployment
- **Best for**: Self-hosted production on Ubuntu/Debian servers
- **Tools**: Docker on VPS with HTTPS setup
- **Complexity**: Medium
- **Guide**: [VPS Guide](./vps)

### 💻 Local Development
- **Best for**: Development and testing
- **Tools**: Node.js + PostgreSQL
- **Complexity**: Low
- **Guide**: See [Development Guide](../guides/development)

## Configuration

All deployments require proper environment configuration:

- [Environment Variables Reference](./environment) - Complete guide for all configuration options

## Quick Comparison

| Method | Best For | Setup Time | Scalability | HTTPS |
|--------|----------|------------|-------------|-------|
| Docker Local | Development | 5 min | Low | No |
| VPS + Docker | Production | 30 min | Medium | Yes |
| Docker Compose | Production | 15 min | Medium | Optional |

## Prerequisites

All deployment methods require:
- Docker Engine 20.10+
- Docker Compose 2.0+
- PostgreSQL 14+ (included in Docker setup)
- OpenAI API Key (for AI features)

## Next Steps

1. **First time deploying?** → Start with [Docker Guide](./docker)
2. **Deploying to VPS?** → Follow [VPS Guide](./vps)
3. **Need environment help?** → Check [Environment Variables](./environment)
4. **Local development?** → See [Development Guide](../guides/development)

## Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Verify health: `curl http://localhost:3000/api/health`
- Review [Troubleshooting](../guides/troubleshooting) guide
