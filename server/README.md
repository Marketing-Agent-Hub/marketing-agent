# Open Campus Vietnam RSS Bot - Server

Backend API server for the Open Campus Vietnam RSS Bot.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Validation**: Zod
- **Auth**: JWT

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# Run Prisma migrations
pnpm prisma:migrate

# Generate Prisma client
pnpm prisma:generate
```

### Development

```bash
# Start development server with hot reload
pnpm dev

# Run linter
pnpm lint

# Format code
pnpm format

# Run tests
pnpm test
```

### Production

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
src/
├── index.ts              # Entry point
├── config/               # Configuration and env validation
├── db/                   # Prisma client singleton
├── middleware/           # Express middleware
├── routes/               # Route definitions
├── controllers/          # HTTP handlers (thin)
├── services/             # Business logic
├── lib/                  # Pure utility functions
├── schemas/              # Zod validation schemas
└── types/                # TypeScript type definitions
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email/password
- `GET /auth/me` - Get current user info

### Sources
- `GET /sources` - List all sources
- `POST /sources` - Create new source
- `PATCH /sources/:id` - Update source
- `DELETE /sources/:id` - Delete source
- `POST /sources/validate` - Validate RSS feed URL

## Environment Variables

See `.env.example` for required environment variables.

## License

MIT
