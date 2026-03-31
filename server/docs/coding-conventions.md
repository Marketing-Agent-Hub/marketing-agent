# Coding Conventions

## Naming Conventions

### Files
- **Kebab-case**: `ai-stage-a.service.ts`, `error-handler.ts`
- **Suffixes indicate module type**:
  - `.service.ts` - Business logic
  - `.controller.ts` - HTTP handlers
  - `.routes.ts` - Route definitions
  - `.schema.ts` - Zod validation
  - `.job.ts` - Cron jobs
  - `.config.ts` - Configuration
  - `.test.ts` - Tests

### Variables & Functions
- **camelCase**: `fetchRssFeed`, `processItemStageA`, `itemsCount`
- **Boolean prefixes**: `isAllowed`, `enabled`, `hasMarketContent`

### Types & Interfaces
- **PascalCase**: `CreateSourceInput`, `ApiErrorResponse`, `ItemStatus`
- **Interface prefix**: Not used (prefer type inference from Zod)

### Constants
- **SCREAMING_SNAKE_CASE**: `MAX_CONTENT_LENGTH_CHARS`, `DENY_KEYWORDS_EN`
- Used for static configuration values

### Enums (Prisma)
- **PascalCase**: `SourceLang`, `ValidationStatus`, `ItemStatus`
- **Values**: SCREAMING_SNAKE_CASE in database

### Classes
- **PascalCase**: `SourceController`, `SourceService`, `HealthService`
- Instantiated as singleton with camelCase: `sourceController`, `sourceService`

## TypeScript Patterns

### Strict Mode
```typescript
// tsconfig.json
"strict": true
"noImplicitReturns": true
"noFallthroughCasesInSwitch": true
```

### Type Inference from Zod
```typescript
export const createSourceSchema = z.object({
  name: z.string().min(1),
  rssUrl: z.string().url(),
});

export type CreateSourceInput = z.infer<typeof createSourceSchema>;
```

### Prisma Types
```typescript
import { Source, ItemStatus } from '@prisma/client';

// Use generated types directly, no manual interfaces
```

### Function Return Types
- **Explicit on public APIs**: `async function login(email: string, password: string): Promise<{ token: string }>`
- **Inferred for internal functions**: Allowed for clarity

### Async/Await
- **Preferred over Promises**: All async code uses async/await
- **No .then()/.catch()**: Use try/catch blocks

### Optional Chaining
```typescript
const publishedAt = item.publishedAt?.toISOString() ?? 'Unknown';
```

## Project Structure Patterns

### Layered Architecture
```
Routes → Controllers → Services → Database
       ↘ Schemas →↗
```

### No Cross-Layer Imports
- Controllers do not import from other controllers
- Services do not import from controllers
- Jobs are thin wrappers around services

### Single Responsibility
- Each service handles one domain (ingestion, extraction, filtering, etc.)
- Controllers handle HTTP concerns only
- Services contain all business logic

## Error Handling Patterns

### Services
```typescript
// Throw errors, let caller handle
if (!source) {
  throw new Error('Source not found');
}
```

### Controllers
```typescript
// Pass errors to Express error handler
try {
  const result = await service.doSomething();
  res.json(result);
} catch (error) {
  next(error);  // Let error middleware handle
}
```

### Jobs
```typescript
// Errors logged by withJobMonitoring wrapper
await withJobMonitoring('JobName', async () => {
  await service.process();
  // Errors automatically caught and logged
});
```

### Custom Error Responses
```typescript
const response: ApiErrorResponse = {
  error: {
    code: 'NOT_FOUND',
    message: 'Resource not found',
  },
};
res.status(404).json(response);
return;
```

## Validation Patterns

### Input Validation (Zod)
```typescript
// In controllers
const params = getSourcesSchema.parse(req.query);
const input = createSourceSchema.parse(req.body);
```

### Runtime Checks
```typescript
// Simple validations inline
const id = parseInt(req.params.id, 10);
if (isNaN(id)) {
  res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid ID' } });
  return;
}
```

## Database Patterns

### Prisma Client Access
```typescript
// Imported from centralized module
import { prisma } from '../db/index.js';
```

### Transactions
```typescript
await prisma.$transaction([
  prisma.item.update({ ... }),
  prisma.article.create({ ... }),
]);
```

### Queries with Relations
```typescript
const item = await prisma.item.findUnique({
  where: { id },
  include: {
    source: true,
    article: true,
    aiResults: true,
  },
});
```

### Pagination Pattern
```typescript
const [data, total] = await Promise.all([
  prisma.model.findMany({
    where,
    orderBy,
    take: limit,
    skip: offset,
  }),
  prisma.model.count({ where }),
]);
```

## Async Patterns

### Route Handlers
```typescript
// Wrap all async routes with asyncHandler
router.get('/', asyncHandler(async (req, res, next) => {
  const result = await service.getData();
  res.json(result);
}));
```

### Job Execution
```typescript
// Wrap with monitoring
await withJobMonitoring('JobName', async () => {
  await service.doWork();
});
```

### Parallel Operations
```typescript
// Use Promise.all for independent operations
const [sources, total] = await Promise.all([
  prisma.source.findMany(),
  prisma.source.count(),
]);
```

## Logging Patterns

### Structured Logging
```typescript
logger.info({ job: 'IngestJob', duration: 1234 }, 'Job completed');
logger.error({ error, context: 'Extraction' }, 'Failed to extract content');
```

### Job Logging
```typescript
// Automatic via withJobMonitoring
logger.info({ job: jobName }, `[${jobName}] Starting...`);
logger.info({ job: jobName, duration }, `[${jobName}] Completed in ${duration}ms`);
```

### HTTP Logging
```typescript
// Automatic via requestMonitoring middleware
// Logs: method, path, statusCode, duration, traceId
```

## Configuration Patterns

### Environment Variables
```typescript
// Validate with Zod on startup
const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
});

const env = envSchema.parse(process.env);
```

### Runtime Configuration
```typescript
// Load from database Setting table
await loadAISettings();

// Access via getter
if (AI_CONFIG.STAGE_A_ENABLED) {
  // AI processing
}
```

### Static Configuration
```typescript
// Export const objects
export const monitorConfig = {
  logging: { level: 'info' },
  telemetry: { enabled: true },
};
```

## Testing Patterns

### Test File Location
```typescript
// Colocated with source
src/__tests__/normalizer.test.ts  // Tests src/lib/normalizer.ts
```

### Test Structure
```typescript
import { describe, it, expect } from 'vitest';

describe('normalizeTags', () => {
  it('converts to lowercase', () => {
    expect(normalizeTags(['FOO'])).toEqual(['foo']);
  });
});
```

## Comment Patterns

### Function Documentation
```typescript
/**
 * Fetch RSS feed from URL with timeout
 */
export async function fetchRssFeed(url: string, timeoutMs = 10000): Promise<string> {
```

### Section Markers
```typescript
// ========== TIER 2: RESOLVE ACTUAL URL ==========
```

### Inline Explanations
```typescript
// Run every 15 minutes
// Cron pattern: minute hour day month weekday
ingestJobTask = cron.schedule('*/15 * * * *', async () => {
```

### TODOs
```typescript
// TODO: Implement rate limiting for OpenAI API
```

## Import/Export Patterns

### ES Module Syntax
```typescript
import { prisma } from '../db/index.js';  // .js extension required
export { function };
export default router;
```

### Named Exports Preferred
```typescript
// Export individual items
export const logger = pino({ ... });
export function asyncHandler() { ... }

// Not: export default { logger, asyncHandler }
```

### Singleton Pattern
```typescript
// Service instantiation
export const sourceService = new SourceService();

// Class-based
export class SourceService {
  async getAllSources() { ... }
}
```

## Code Organization

### File Structure
```typescript
// 1. Imports
import { ... } from '...';

// 2. Constants
const MAX_RETRIES = 3;

// 3. Types (if not in separate file)
interface LocalType { ... }

// 4. Main implementation
export function mainFunction() { ... }

// 5. Helper functions (private)
function helperFunction() { ... }
```

### Function Length
- Prefer smaller functions (<50 lines)
- Extract complex logic into helper functions
- Use descriptive function names over comments

### Nesting Depth
- Max 3 levels of nesting
- Early returns to reduce nesting
```typescript
if (!condition) return; // Early exit
// Main logic at top level
```
