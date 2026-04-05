# Tech Stack

## Runtime & Language

- **Node.js**: 24 (slim Docker image)
- **TypeScript**: 5.7.2, ES2022 target, nodenext modules
- **Package Manager**: npm with lock file

## Web Framework

- **Express**: 4.21.2
- **CORS**: 2.8.5 - configurable origin
- **Body Parsing**: Built-in express.json(), express.urlencoded()

## Database

- **PostgreSQL**: Primary data store
- **Prisma**: 5.22.0 - ORM with migrations
  - Client generation via `prisma generate`
  - Schema-first approach
  - Type-safe queries

## Authentication & Security

- **JWT**: jsonwebtoken 9.0.2 - Bearer token authentication
- **Password Hashing**: bcrypt 5.1.1
- **Validation**: Zod 3.24.1 - runtime schema validation

## AI & Content Processing

- **OpenAI**: 6.25.0 - GPT models for categorization and content generation
- **Mozilla Readability**: 0.6.0 - article content extraction
- **JSDOM**: 28.1.0 - DOM parsing for web scraping
- **fast-xml-parser**: 4.5.0 - RSS/Atom feed parsing

## Scheduling & Jobs

- **node-cron**: 4.2.1 - background job scheduling
- Pattern: `*/15 * * * *` (every 15 minutes)

## Observability

### Telemetry
- **OpenTelemetry SDK**: 0.212.0 / 2.5.1
  - Auto instrumentation for Node.js
  - Express and HTTP instrumentation
  - Distributed tracing
- **Prometheus Exporter**: 0.212.0 - metrics endpoint on port 9464

### Logging
- **Pino**: 10.3.1 - structured JSON logging
- **pino-http**: 11.0.0 - HTTP request logging
- **pino-pretty**: 13.1.3 - development pretty printing

## Testing

- **Vitest**: 2.1.8 - test runner
- **Coverage**: @vitest/coverage-v8 2.1.8

## Development Tools

- **tsx**: 4.19.2 - TypeScript execution and watch mode
- **ESLint**: 8.57.1 with TypeScript plugin
- **Prettier**: 3.4.2 - code formatting
- **TypeScript ESLint**: 7.18.0

## Type Definitions

All production dependencies have corresponding `@types/*` packages:
- @types/express, @types/cors, @types/bcrypt
- @types/jsonwebtoken, @types/jsdom
- @types/node-cron, @types/node

## Deployment

- **Docker**: Multi-stage build (builder + production)
- **Base Image**: node:24-slim
- **System Dependencies**: openssl, ca-certificates

## Module System

- **Type**: "module" in package.json
- **Resolution**: nodenext
- **Extensions**: Explicit `.js` imports (compiled from `.ts`)
