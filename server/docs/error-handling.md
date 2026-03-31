# Error Handling

## Error Flow

```
Error Thrown
    ↓
asyncHandler wrapper catches Promise rejection
    ↓
Passes to Express error middleware via next(error)
    ↓
errorHandler middleware processes error
    ↓
JSON error response sent to client
```

## Error Handling by Layer

### Controllers

**Pattern**: Try-catch with next(error)

```typescript
async createSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSourceSchema.parse(req.body);
    const source = await sourceService.createSource(input);
    res.status(201).json(source);
  } catch (error) {
    next(error);  // Pass to error middleware
  }
}
```

**Rules**:
- Never send error responses directly
- Always pass errors to next()
- Let error middleware handle formatting

### Services

**Pattern**: Throw errors, let caller handle

```typescript
async getSourceById(id: number): Promise<Source | null> {
  const source = await prisma.source.findUnique({ where: { id } });
  
  if (!source) {
    throw new Error('Source not found');  // Caller decides status code
  }
  
  return source;
}
```

**Rules**:
- Throw descriptive error messages
- No HTTP concerns (status codes, response formatting)
- Use standard Error class

### Jobs

**Pattern**: Wrapped with withJobMonitoring

```typescript
await withJobMonitoring('IngestJob', async () => {
  await ingestAllSources();
  // Errors automatically caught, logged, and recorded as metrics
});
```

**Behavior**:
- Errors logged with full stack trace
- Metrics recorded (job_completed_total{status="error"})
- Job continues on next schedule (no crash)

### Routes

**Pattern**: asyncHandler wrapper

```typescript
router.get('/', asyncHandler(async (req, res, next) => {
  const result = await controller.getData(req, res, next);
}));
```

**Purpose**: Catches Promise rejections, passes to error middleware

---

## Error Middleware

### Location
`src/middleware/error-handler.ts`

### Signature
```typescript
function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void
```

### Processing Logic

```typescript
// 1. ZodError (validation)
if (err instanceof ZodError) {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.errors,
    },
  });
}

// 2. Custom errors with statusCode
if ('statusCode' in err) {
  return res.status(err.statusCode).json({
    error: {
      code: err.code || 'INTERNAL',
      message: err.message,
    },
  });
}

// 3. Unknown errors
return res.status(500).json({
  error: {
    code: 'INTERNAL',
    message: NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  },
});
```

### Error Response Format

```typescript
interface ApiErrorResponse {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'INTERNAL' | 'FORBIDDEN';
    message: string;
    details?: unknown;  // Only for validation errors
  };
}
```

---

## Error Types

### Validation Errors (400)

**Source**: Zod schema validation

```typescript
const input = createSourceSchema.parse(req.body);
// Throws ZodError if validation fails
```

**Response**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "string",
        "path": ["name"],
        "message": "Name is required"
      }
    ]
  }
}
```

### Authentication Errors (401)

**Source**: JWT verification in auth middleware

```typescript
// src/middleware/auth.ts
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authorization header',
    },
  });
}
```

### Not Found Errors (404)

**Source**: Resource lookup in controllers

```typescript
const source = await sourceService.getSourceById(id);
if (!source) {
  return res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Source not found',
    },
  });
}
```

### Internal Errors (500)

**Source**: Unhandled exceptions

**Production**: Generic message
```json
{
  "error": {
    "code": "INTERNAL",
    "message": "Internal server error"
  }
}
```

**Development**: Detailed message
```json
{
  "error": {
    "code": "INTERNAL",
    "message": "Cannot read property 'id' of undefined"
  }
}
```

---

## Error Logging

### HTTP Errors

**Middleware**: `src/middleware/monitoring.ts`

```typescript
export const errorMonitoring = async (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await logService.log({
    level: 'ERROR',
    message: err.message,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    error: err.message,
    stack: err.stack,
    traceId: getTraceId(),
  });
  next(err);
};
```

### Job Errors

**Wrapper**: `src/lib/job-monitoring.ts`

```typescript
catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  await logService.log({
    level: 'ERROR',
    message: `[${jobName}] Job failed: ${errorMessage}`,
    service: 'job',
    context: jobName,
    duration,
    error: errorMessage,
    stack: errorStack,
  });

  logger.error({ job: jobName, error: errorMessage, stack: errorStack });

  await metricService.incrementCounter('job_completed_total', 1, {
    job: jobName,
    status: 'error',
  });

  throw error;
}
```

### Service Errors

**Helper**: `src/lib/job-monitoring.ts`

```typescript
export async function logProcessingError(
  context: string,
  message: string,
  error: Error
) {
  await logService.log({
    level: 'ERROR',
    message: `[${context}] ${message}`,
    context,
    error: error.message,
    stack: error.stack,
  });
}
```

---

## Error Recovery

### Jobs

- **Transient failures**: Job retries on next schedule
- **Persistent failures**: Logged, metrics recorded, job continues
- **No cascading failures**: One item error doesn't stop batch processing

```typescript
for (const item of items) {
  try {
    await processItem(item);
  } catch (error) {
    logger.error({ itemId: item.id, error }, 'Failed to process item');
    // Continue with next item
  }
}
```

### HTTP Requests

- **Client errors** (4xx): Return immediately, no retry
- **Server errors** (5xx): Client decides retry strategy
- **Timeout errors**: Configurable timeouts on external requests

### External APIs

**RSS Feeds**:
```typescript
try {
  const xml = await fetchRssFeed(url, 10000);  // 10s timeout
} catch (error) {
  await prisma.source.update({
    where: { id },
    data: { lastFetchStatus: error.message },
  });
  // Source disabled manually if persistent failures
}
```

**OpenAI**:
```typescript
try {
  const response = await openai.chat.completions.create({ ... });
} catch (error) {
  // Fall back to heuristic filtering
  if (!AI_CONFIG.STAGE_A_ENABLED) {
    return applyHeuristicFilter(item);
  }
  throw error;
}
```

### Database Errors

- **Connection errors**: Prisma retries automatically
- **Constraint violations**: Caught and handled (e.g., skipDuplicates)
- **Transaction failures**: Rolled back automatically

---

## Error Monitoring

### Sources

1. **SystemLog table** - All logged errors
2. **Pino files** - `logs/error.log`
3. **Metrics** - `job_completed_total{status="error"}`
4. **Health checks** - Service availability

### Queries

**Recent errors**:
```sql
SELECT * FROM system_logs 
WHERE level = 'ERROR' 
ORDER BY created_at DESC 
LIMIT 50;
```

**Error rate by service**:
```sql
SELECT service, COUNT(*) as error_count
FROM system_logs
WHERE level = 'ERROR' AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY service;
```

**Job failure rate**:
```sql
SELECT name, SUM(CASE WHEN labels->>'status' = 'error' THEN value ELSE 0 END) as failures
FROM system_metrics
WHERE name = 'job_completed_total'
GROUP BY name;
```

---

## Debug Information

### Development Mode

- Full error messages in responses
- Stack traces in logs
- Pretty-printed logs
- Verbose database query logging

### Production Mode

- Generic error messages in responses
- Stack traces only in logs
- JSON logs
- Minimal query logging

### Trace IDs

All errors include OpenTelemetry trace IDs for correlation:

```typescript
logger.error({
  traceId: 'abc123',
  spanId: 'def456',
  error: 'Something went wrong',
});
```

Query logs by trace ID to see full request context.

---

## Best Practices

### Do's

✅ Use async/await consistently
✅ Pass errors to next() in controllers
✅ Throw descriptive errors in services
✅ Log errors with context
✅ Include stack traces
✅ Use try-catch for external API calls
✅ Validate input with Zod
✅ Return early on validation failures

### Don'ts

❌ Swallow errors silently
❌ Return 500 for expected errors
❌ Expose sensitive data in error messages
❌ Use generic "Error" messages
❌ Handle errors inconsistently
❌ Forget to log errors
❌ Block main thread with error processing
