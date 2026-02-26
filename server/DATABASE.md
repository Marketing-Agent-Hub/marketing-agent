# Database Setup Guide

## Prerequisites

- PostgreSQL 14 or higher
- Node.js 20 or higher

## Option 1: Local PostgreSQL Installation

1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database:
```sql
CREATE DATABASE rss_bot;
```

3. Update `.env` file with your connection string:
```
DATABASE_URL="postgresql://username:password@localhost:5432/rss_bot?schema=public"
```

## Option 2: Docker PostgreSQL

1. Start PostgreSQL container:
```bash
docker run --name ocvn-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=rss_bot \
  -p 5432:5432 \
  -d postgres:14
```

2. Use this connection string in `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rss_bot?schema=public"
```

## Running Migrations

After setting up the database, run migrations:

```bash
npm run prisma:migrate
```

This will create all necessary tables based on the schema in `prisma/schema.prisma`.

## View Database

Open Prisma Studio to view and edit data:

```bash
npm run prisma:studio
```

This opens a web interface at http://localhost:5555

## Database Schema

### sources

| Column | Type | Description |
|--------|------|-------------|
| id | Integer | Primary key, auto-increment |
| name | String | Source display name |
| rssUrl | String | RSS feed URL (unique) |
| siteUrl | String? | Website URL (optional) |
| lang | Enum (VI/EN/MIXED) | Content language |
| topicTags | String[] | Topic tags |
| trustScore | Integer (0-100) | Trust score, default 70 |
| enabled | Boolean | Whether to fetch, default false |
| fetchIntervalMinutes | Integer | Fetch interval, default 60 |
| denyKeywords | String[] | Keywords to filter out |
| notes | String? | Admin notes |
| lastValidatedAt | DateTime? | Last validation timestamp |
| lastValidationStatus | Enum (OK/FAILED)? | Last validation result |
| createdAt | DateTime | Creation timestamp |
| updatedAt | DateTime | Last update timestamp |

### Indexes

- `enabled` (for query performance)
- `trustScore` (for query performance)
- `rssUrl` (unique constraint)

## Reset Database

To reset the database (WARNING: deletes all data):

```bash
npx prisma migrate reset
```

## Generate Admin Password Hash

To generate a password hash for the admin user:

```bash
npx tsx scripts/generate-password-hash.ts your-password
```

Copy the output and paste it into the `.env` file as `ADMIN_PASSWORD_HASH`.
