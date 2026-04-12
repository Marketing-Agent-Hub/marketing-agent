# Design Decisions

## Inferred & Explicit Architectural Decisions

---

### D-01: Modular Monolith over Microservices

**Decision**: All code runs in one Node.js process with domain-separated modules.

**Reasoning**: The team size and current scale does not justify the operational overhead of microservices (separate deployments, service meshes, distributed tracing setup). The modular structure means domain boundaries are already defined — migration to microservices is possible later by extracting domains into separate processes.

**Trade-off**: A single crashing unhandled exception could theoretically affect all domains. Mitigated by the global `asyncHandler` wrapper and Express error middleware.

---

### D-02: OpenRouter Instead of Direct OpenAI

**Decision**: All AI calls go to `https://openrouter.ai/api/v1` using the OpenAI-compatible SDK.

**Reasoning**: OpenRouter provides a single API to access multiple AI providers (OpenAI, Anthropic, Mistral, etc.) with simple model-string switching. This allows changing models without code changes and provides built-in fallback routing.

**Trade-off**: Adds a third-party intermediary to every AI call. If OpenRouter has an outage, all AI features fail. However, the custom `OpenRouterCreditError` and `OpenRouterOverloadedError` handling shows awareness and mitigation of this risk.

---

### D-03: Model Settings in Database (not Environment Variables)

**Decision**: AI model names are stored in the `settings` table and fetched at runtime, not in `.env`.

**Reasoning**: Allows operational model switching without redeployment. An admin can change the model (e.g., upgrade Stage B from `gpt-4o-mini` to `gpt-4o`) through the API immediately.

**Trade-off**: Every AI call requires a DB lookup to fetch the model name. Currently not cached, meaning extra latency per call.

**Risk**: If the `settings` table is empty (e.g., fresh database), the system falls back to hardcoded defaults in `SettingService.MODEL_DEFAULTS`. This is the correct pattern.

---

### D-04: Two Separate Auth Systems for Product vs. Internal

**Decision**: Product users and system admins use different JWT issuers, middleware, and credential stores.

**Reasoning**: Separating product auth from internal/admin auth prevents accidental privilege escalation. A compromised product user token cannot be used to access internal admin endpoints.

**Trade-off**: Two sets of middleware to maintain and test. Both currently use the same `JWT_SECRET`, which means a token from one system could theoretically be accepted by the other's verification logic if not careful. This is a **latent security risk**.

**Recommendation**: Use separate secrets for product and internal JWTs, or add an `audience` claim check.

---

### D-05: Fire-and-Forget Onboarding Analysis

**Decision**: When an onboarding session is completed, the AI analysis job is triggered with `setImmediate` and the HTTP response returns immediately.

**Reasoning**: AI analysis can take 5–30 seconds; making the HTTP client wait would cause timeout issues and poor UX.

**Trade-off**: There is no mechanism to communicate analysis failure back to the caller. The frontend must poll for the `BrandProfile` to appear.

**Improvement**: Consider using a webhook or server-sent events to push the analysis result to the frontend when ready.

---

### D-06: Dual Ingestion Paths (Legacy + Multi-Tenant)

**Decision**: `IngestJob` runs both `ingestAllSources()` and `ingestAllBrandSources()` concurrently.

**Reasoning**: The system is mid-migration from a legacy single-tenant model (global `sources`) to a multi-tenant model (`BrandSource`). Running both ensures nothing is lost during the transition.

**Trade-off**: Items may be ingested twice if a source exists in both global sources and brand sources. Deduplication via unique constraint prevents double-saving.

**Action Required**: The comment in `ingest.job.ts` explicitly flags this as a `TODO`: once all sources are migrated to `BrandSource`, `ingestAllSources()` should be removed.

---

### D-07: AI Filtering and Stage A Currently Disabled for Testing

**Decision**: The market/trading keyword filter in `filtering.service.ts` is commented out. Stage A's `isAllowed` result is overridden to always be `true`.

**Reasoning**: Development/testing phase — allowing all content through makes it easier to observe the full pipeline without content being unexpectedly blocked.

**Risk**: This is a **production risk**. If deployed with these overrides, the system will process and generate posts for all content regardless of relevance or brand safety. The code comments clearly identify this as temporary.

**Action Required**: Before production deployment, remove the `// FILTERING DISABLED FOR TESTING` override and the `isAllowed: true` force in `callStageA()`.

---

### D-08: No Queue System for Background Jobs

**Decision**: Background jobs run as in-process `node-cron` tasks or `setInterval` loops.

**Reasoning**: Acceptable for current scale. A message queue (BullMQ, RabbitMQ, SQS) would add infrastructure complexity that is not yet needed.

**Scalability Risk**: As item volume grows, in-process jobs may compete with HTTP request handling for CPU/memory. There is no back-pressure mechanism — if items accumulate faster than they are processed, the batch sizes simply lag behind.

**Future Path**: Extract background jobs to a separate worker process or queue (BullMQ with Redis) when pipeline throughput becomes a bottleneck.

---

### D-09: No JWT Expiry on Product Tokens

**Observation**: The `auth.service.ts` does not set an `expiresIn` option when calling `jwt.sign()`.

**Risk**: Product JWTs never expire. A stolen token remains valid indefinitely.

**Recommendation**: Set `expiresIn: '7d'` (or similar) and implement refresh token flow.

---

### D-10: Stub Social Media Connectors

**Decision**: All social media publishing uses `StubConnector`, simulating success without making real API calls.

**Reasoning**: The social platform integrations (Facebook Graph API, Twitter API v2, LinkedIn API) are complex and require OAuth, app review, and platform-specific content formatting. The architecture is designed to support them without the implementation being done yet.

**Impact**: The publish scheduler runs and creates `PublishedPost` records, but no content actually reaches any social platform. This is transparent in the codebase but must be clearly communicated to stakeholders.

---

### D-11: Content Intelligence Pipeline is Domain-Specific (EdTech + Blockchain)

**Observation**: The `source-discovery.job.ts` search queries are hardcoded to specific domains (EdTech, Blockchain, Vietnamese content). The Stage B prompt is written in Vietnamese and tuned for Facebook posts specifically.

**Implication**: This is not a generic news aggregator. It is built for a specific customer/market (likely an OC — OnChain — brand in Vietnam operating in EdTech and Web3).

**Risk**: Adding support for other industries or languages requires code changes, not configuration.

---

### D-12: Vector Profile Stored as Raw JSON Float Array

**Decision**: The `FilterProfile.vectorProfile` is stored as a `Json` column containing a `number[]`.

**Trade-off**: Avoids adding a vector database (pgvector, Pinecone, Qdrant) to the stack. Cosine similarity is computed in-application JavaScript. This works at small scale but is not efficient for large collections.

**Scalability Limit**: At thousands of items per day requiring embedding comparison, in-memory similarity computation will become a bottleneck. At that scale, migrating to `pgvector` (a Postgres extension) would be the right next step with minimal infrastructure change.
