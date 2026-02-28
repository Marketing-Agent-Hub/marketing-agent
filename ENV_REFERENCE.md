# Environment Variables Reference

Complete guide for all environment variables used in ocNewsBot.

## Overview

The project uses different environment files:
- **`.env`** (local dev) - Backend & frontend development
- **`.env.docker`** (production) - Docker deployment
- **`docker-compose.yml`** - Auto-set some variables

## Backend Variables

### Required (No Defaults)

#### `DATABASE_URL`
- **Type**: PostgreSQL connection string
- **Format**: `postgresql://username:password@host:port/database?schema=public`
- **Local Dev**: `postgresql://postgres:password@localhost:5432/ocvn_rss_bot?schema=public`
- **Docker**: Auto-set in `docker-compose.yml`
- **Used in**: Prisma database connection

#### `JWT_SECRET`
- **Type**: String (min 16 chars, recommend 32+)
- **Generate**: `openssl rand -base64 32`
- **Example**: `XyZ9kL2mN4pQ7rS1tU8vW0aB3cD5eF6g`
- **Used in**: JWT token signing/verification
- **Security**: Change in production! Never commit to git.

#### `OPENAI_API_KEY`
- **Type**: OpenAI API key
- **Format**: `sk-...` (starts with sk-)
- **Get from**: https://platform.openai.com/api-keys
- **Used in**: AI Stage A & B processing
- **Cost**: Charges apply per API usage

#### `ADMIN_EMAIL`
- **Type**: Email address
- **Example**: `admin@opencampus.vn`
- **Used in**: Admin authentication (first user)
- **Note**: Only this email can login

#### `ADMIN_PASSWORD_HASH`
- **Type**: Bcrypt hash
- **Generate**: 
  ```bash
  # Windows
  .\generate-password-hash.ps1 "your-password"
  
  # Linux/Mac
  ./generate-password-hash.sh "your-password"
  
  # Manual
  node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
  ```
- **Example**: `$2b$10$rZ8PYLhG5Y8nJ0wQ6qKQme7XL6K1mK5t1K7X5vK9h8L3Rz2Yz3Z4e`
- **Used in**: Admin password verification
- **Security**: Never store plain password!

#### `CORS_ORIGIN`
- **Type**: URL
- **Local Dev**: `http://localhost:5173` (Vite's default port)
- **Docker**: `http://localhost` or your domain
- **Production**: `https://yourdomain.com`
- **Used in**: CORS middleware
- **Note**: Must match frontend URL exactly

### Optional (Has Defaults)

#### `AI_STAGE_A_MODEL`
- **Type**: OpenAI model name
- **Default**: `gpt-4o-mini`
- **Options**: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`
- **Used in**: AI Stage A (quick filter, cost-effective)
- **Cost**: Lower cost with mini model

#### `AI_STAGE_B_MODEL`
- **Type**: OpenAI model name
- **Default**: `gpt-4o`
- **Options**: `gpt-4o`, `gpt-4o-mini`
- **Used in**: AI Stage B (quality Vietnamese summaries)
- **Cost**: Higher cost but better quality

#### `PORT`
- **Type**: Number
- **Default**: `3001` (dev), `3000` (docker)
- **Docker**: Set in `docker-compose.yml`
- **Used in**: Express server port
- **Note**: Change if port conflicts

#### `NODE_ENV`
- **Type**: Enum
- **Options**: `development`, `production`, `test`
- **Default**: `development`
- **Docker**: Set to `production` in `docker-compose.yml`
- **Used in**: Enable/disable features, logging verbosity

## Frontend Variables

### Optional (Has Defaults)

#### `VITE_API_BASE_URL`
- **Type**: URL
- **Local Dev**: `http://localhost:3000/api` (backend port)
- **Docker**: `/api` (nginx proxy handles routing)
- **Used in**: API client base URL
- **Note**: Must match backend URL

## Docker-Specific

These are set in `docker-compose.yml` and don't need to be in `.env.docker`:

### Auto-Set by Docker Compose

- **Backend `DATABASE_URL`**: Points to `postgres` service
- **Backend `PORT`**: Always `3000`
- **Backend `NODE_ENV`**: Always `production`
- **Frontend build-time `VITE_API_BASE_URL`**: Set to `/api`
- **PostgreSQL `POSTGRES_USER`**: `postgres`
- **PostgreSQL `POSTGRES_PASSWORD`**: `m1505` (CHANGE IN PRODUCTION!)
- **PostgreSQL `POSTGRES_DB`**: `rss_bot`

## Files Comparison

### Local Development

**server/.env:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/ocvn_rss_bot?schema=public"
JWT_SECRET="dev-secret-key-change-in-production"
ADMIN_EMAIL="admin@opencampus.vn"
ADMIN_PASSWORD_HASH="$2b$10$..."
CORS_ORIGIN="http://localhost:5173"
PORT=3001
NODE_ENV="development"
OPENAI_API_KEY="sk-..."
AI_STAGE_A_MODEL="gpt-4o-mini"
AI_STAGE_B_MODEL="gpt-4o"
```

**web/.env:**
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### Docker Deployment

**.env.docker:**
```env
# REQUIRED
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
OPENAI_API_KEY=sk-your-openai-key-here
ADMIN_EMAIL=admin@opencampus.vn
ADMIN_PASSWORD_HASH=$2b$10$...
CORS_ORIGIN=http://localhost

# OPTIONAL (override defaults)
AI_STAGE_A_MODEL=gpt-4o-mini
AI_STAGE_B_MODEL=gpt-4o
```

**docker-compose.yml sets:**
- DATABASE_URL
- PORT=3000
- NODE_ENV=production
- VITE_API_BASE_URL=/api

## Security Best Practices

### Never Commit
- ❌ `.env` (local dev secrets)
- ❌ `.env.docker` (production secrets)
- ✅ `.env.example` (templates only)
- ✅ `.env.docker.example` (templates only)

### Strong Secrets
```bash
# Generate JWT_SECRET (32 bytes)
openssl rand -base64 32

# Generate admin password hash
./generate-password-hash.sh "YourSecurePassword123!"

# Use password manager for storing secrets
```

### Production Checklist
- [ ] JWT_SECRET is random & 32+ chars
- [ ] ADMIN_PASSWORD_HASH is NOT the example/default
- [ ] OPENAI_API_KEY is valid & has credits
- [ ] PostgreSQL password changed in docker-compose.yml
- [ ] CORS_ORIGIN matches your domain
- [ ] .env and .env.docker are in .gitignore
- [ ] Backup .env.docker securely (encrypted)

## Troubleshooting

### "Environment variable X is required"
- Check `.env` or `.env.docker` exists
- Verify variable name spelling
- Ensure no extra spaces around `=`
- Check quotes (use `"..."` for values with spaces)

### "Invalid JWT_SECRET"
- Must be at least 16 characters
- Generate new one: `openssl rand -base64 32`

### "Invalid CORS_ORIGIN"
- Must be a valid URL (include http:// or https://)
- Must match frontend URL exactly
- No trailing slash

### "OpenAI API key invalid"
- Verify key starts with `sk-`
- Check key hasn't been revoked
- Ensure account has credits

### "Cannot connect to database"
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Ensure network connectivity (Docker: postgres service running)
- Verify password matches

## Environment Loading Order

1. **Docker Compose**:
   ```
   docker-compose.yml (base config)
   → .env.docker (override/add secrets)
   → container environment
   ```

2. **Local Dev**:
   ```
   .env file
   → process.env
   → config/env.ts validation
   ```

## Adding New Variables

If you add a new environment variable:

1. **Add to schema**: `server/src/config/env.ts` or `server/src/config/ai.config.ts`
2. **Add to templates**: `.env.example` and `.env.docker.example`
3. **Document here**: Add to this file
4. **Docker**: Add to `docker-compose.yml` if needed
5. **Update docs**: Update README.Docker.md and DEPLOY_VPS.md

Example:
```typescript
// server/src/config/env.ts
export const envSchema = z.object({
  // ... existing vars
  NEW_VARIABLE: z.string().default('default-value'),
});
```
