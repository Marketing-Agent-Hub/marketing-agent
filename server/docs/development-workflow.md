# Development Workflow

## Prerequisites

- **Node.js**: 24+ (LTS recommended)
- **PostgreSQL**: 14+ running locally or accessible
- **npm**: Included with Node.js

## Initial Setup

### 1. Clone & Install

```bash
cd server
npm install
```

### 2. Environment Configuration

Create `.env` file:

```bash
# Copy from example (if exists) or create new
touch .env
```

Required variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/newsbot
JWT_SECRET=your-secret-at-least-16-chars
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=<bcrypt-hash>
CORS_ORIGIN=http://localhost:3000
PORT=3001
NODE_ENV=development
USER_AGENT=NewsAggregatorBot/1.0

# Optional - for AI features
OPENAI_API_KEY=sk-...
AI_STAGE_A_MODEL=gpt-4o-mini
AI_STAGE_B_MODEL=gpt-4o
```

### 3. Generate Password Hash

```bash
npm run build
node dist/scripts/generate-password-hash.js
```

Copy hash to `ADMIN_PASSWORD_HASH` in `.env`.

### 4. Database Setup

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Optionally seed initial data via Prisma Studio
npm run prisma:studio
```

---

## Development Commands

### Start Development Server

```bash
npm run dev
```

- Runs with `tsx watch` for hot reload
- Auto-restarts on file changes
- Listens on port 3001 (or PORT env var)

### Build for Production

```bash
npm run build
```

- Compiles TypeScript to JavaScript in `dist/`
- Generates source maps and declarations

### Start Production Server

```bash
npm start
```

- Runs compiled code from `dist/`
- No hot reload

---

## Database Workflow

### Create Migration

After modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

- Prompts for migration name
- Generates SQL in `prisma/migrations/`
- Applies migration to database
- Regenerates Prisma Client

### Browse Database

```bash
npm run prisma:studio
```

- Opens GUI at `http://localhost:5555`
- View/edit data
- Useful for debugging

### Reset Database

```bash
npx prisma migrate reset
```

- **Warning**: Deletes all data
- Reapplies all migrations
- Useful for development

---

## Testing

### Run Tests

```bash
npm test
```

- Runs Vitest in watch mode
- Auto-reruns on file changes

### Run Tests Once

```bash
npm test -- --run
```

### Coverage Report

```bash
npm run test:coverage
```

- Generates HTML report in `coverage/`
- Opens in browser

### Test Pipeline

```bash
npm run test:pipeline
```

- Runs full pipeline integration test
- Tests all stages end-to-end

---

## Code Quality

### Lint

```bash
npm run lint
```

- Checks TypeScript files with ESLint
- Reports errors and warnings

### Auto-fix Linting

```bash
npm run lint:fix
```

- Fixes auto-fixable issues
- Still reports unfixable issues

### Format Code

```bash
npm run format
```

- Formats all TypeScript files with Prettier
- Applies consistent style

---

## Adding Features

### 1. Add New Service

```bash
# Create service file
touch src/services/new-feature.service.ts
```

```typescript
import { prisma } from '../db/index.js';

export async function processNewFeature() {
  // Business logic
}
```

### 2. Add Background Job (Optional)

```bash
# Create job file
touch src/jobs/new-feature.job.ts
```

```typescript
import cron from 'node-cron';
import { processNewFeature } from '../services/new-feature.service.js';
import { withJobMonitoring } from '../lib/job-monitoring.js';

let jobTask: ScheduledTask | null = null;

export function startNewFeatureJob() {
  jobTask = cron.schedule('*/10 * * * *', async () => {
    await withJobMonitoring('NewFeatureJob', async () => {
      await processNewFeature();
    });
  });
}

export function stopNewFeatureJob() {
  if (jobTask) {
    jobTask.stop();
    jobTask = null;
  }
}
```

Register in `src/index.ts`:
```typescript
import { startNewFeatureJob, stopNewFeatureJob } from './jobs/new-feature.job.js';

// In startup
startNewFeatureJob();

// In shutdown
stopNewFeatureJob();
```

### 3. Add API Endpoint

```bash
# Create schema
touch src/schemas/new-feature.schema.ts

# Create controller
touch src/controllers/new-feature.controller.ts

# Create routes
touch src/routes/new-feature.routes.ts
```

**Schema**:
```typescript
import { z } from 'zod';

export const newFeatureSchema = z.object({
  field: z.string().min(1),
});

export type NewFeatureInput = z.infer<typeof newFeatureSchema>;
```

**Controller**:
```typescript
import { Request, Response, NextFunction } from 'express';
import { newFeatureService } from '../services/new-feature.service.js';
import { newFeatureSchema } from '../schemas/new-feature.schema.js';

export class NewFeatureController {
  async handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = newFeatureSchema.parse(req.body);
      const result = await newFeatureService.process(input);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const newFeatureController = new NewFeatureController();
```

**Routes**:
```typescript
import { Router } from 'express';
import { newFeatureController } from '../controllers/new-feature.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.post('/', requireAuth, asyncHandler((req, res, next) => 
  newFeatureController.handle(req, res, next)
));

export default router;
```

Register in `src/routes/index.ts`:
```typescript
import newFeatureRoutes from './new-feature.routes.js';

router.use('/new-feature', newFeatureRoutes);
```

### 4. Add Database Model

Edit `prisma/schema.prisma`:
```prisma
model NewFeature {
  id        Int      @id @default(autoincrement())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("new_features")
}
```

Create migration:
```bash
npm run prisma:migrate
```

---

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logs

Enable verbose logging:
```env
NODE_ENV=development  # Enables debug level
```

View logs:
```bash
# Real-time
tail -f logs/all.log

# Errors only
tail -f logs/error.log
```

### Database Queries

Enable query logging in `src/db/index.ts`:
```typescript
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
```

### OpenTelemetry Traces

View traces in logs or connect trace collector during development.

---

## Docker Development

### Build Image

```bash
docker build -t newsbot-server .
```

### Run Container

```bash
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET=... \
  -e ADMIN_EMAIL=... \
  -e ADMIN_PASSWORD_HASH=... \
  -e CORS_ORIGIN=http://localhost:3000 \
  newsbot-server
```

### Docker Compose (recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: newsbot
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  server:
    build: .
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/newsbot
      JWT_SECRET: your-secret
      ADMIN_EMAIL: admin@example.com
      ADMIN_PASSWORD_HASH: <hash>
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "3001:3001"
      - "9464:9464"  # Prometheus metrics

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up
```

---

## Monitoring During Development

### Prometheus Metrics

Visit: `http://localhost:9464/metrics`

View job metrics, HTTP metrics, custom counters.

### Health Checks

```bash
curl http://localhost:3001/api/health
```

### Database Monitoring

```bash
# Query logs
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/monitor/logs?level=ERROR&limit=10

# Query metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/monitor/metrics?name=job_completed_total

# Health check history
curl -H "Authorization: Bearer <token>" \
  http://localhost:3001/api/monitor/health
```

---

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed

- Verify PostgreSQL is running
- Check DATABASE_URL format
- Test connection: `psql $DATABASE_URL`

### Prisma Client Not Generated

```bash
npm run prisma:generate
```

### TypeScript Errors

```bash
# Clean build
rm -rf dist
npm run build
```

### Migration Failed

```bash
# Reset and retry
npx prisma migrate reset
npm run prisma:migrate
```

---

## Git Workflow

### Branches

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Urgent fixes

### Commit Messages

```
feat: add AI Stage C for summarization
fix: resolve extraction timeout issue
chore: update dependencies
docs: add API documentation
test: add extraction service tests
refactor: simplify filtering logic
```

### Before Commit

```bash
npm run lint
npm run format
npm test -- --run
```

---

## Production Deployment

### Build

```bash
npm run build
npm run prisma:generate
```

### Environment

- Set `NODE_ENV=production`
- Use strong JWT_SECRET
- Configure DATABASE_URL for production DB
- Set CORS_ORIGIN to production frontend URL

### Run Migrations

```bash
npx prisma migrate deploy
```

### Start Server

```bash
npm start
```

Or use process manager:
```bash
pm2 start dist/index.js --name newsbot-server
```

### Monitor

- Check `/api/health`
- Monitor Prometheus metrics
- Review logs in `logs/`
- Query monitoring endpoints

---

## Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **OpenTelemetry**: https://opentelemetry.io/docs/languages/js/
- **Vitest**: https://vitest.dev/
- **Zod**: https://zod.dev/
- **Express**: https://expressjs.com/
