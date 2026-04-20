**Roadmap Nâng Cấp Chuẩn Doanh Nghiệp (Marketing Agent)**

1. **Kiến trúc & module hóa**
- Tách rõ 3 lớp: `API (controllers/routes)` → `Application services` → `Domain`.
- Chuẩn hóa boundary giữa các domain lớn: `content-intelligence`, `publishing`, `wallet`, `auth`, `job-scheduling`.
- Giảm “god services” bằng cách split theo use-case (vd: `TopUpService` thành `TopUpRequestService`, `BillingService`, `ReconciliationService`).

2. **Bảo mật doanh nghiệp**
- Bổ sung `RBAC + permission matrix` theo workspace/brand/action.
- Secret management qua Vault/SSM, không để secret trong `.env` production.
- Bật audit log bất biến cho các hành động nhạy cảm: AI config, billing, approve/reject, publish.
- Thêm WAF/rate-limit theo tenant và chống abuse cho endpoint AI.

3. **Độ tin cậy & vận hành**
- Chuẩn hóa idempotency cho toàn bộ pipeline jobs (ingest/extract/filter/stage A/B).
- Dùng hàng đợi + retry policy có DLQ (BullMQ/SQS) thay cho cron thuần ở các job quan trọng.
- SLO/SLA rõ ràng: API latency, job completion rate, publish success rate.
- Bổ sung runbook sự cố + cơ chế graceful degradation khi OpenAI/Stripe lỗi.

4. **Data & compliance**
- Migration strategy chuẩn (expand/contract), rollback-safe.
- Data retention policy theo loại dữ liệu (raw feed, AI output, logs, billing events).
- PII classification + encryption at rest/in transit.
- Backup/restore định kỳ, test DR (disaster recovery) theo quý.

5. **Chất lượng code & delivery**
- Thiết lập quality gate CI: lint + typecheck + unit + integration + security scan + coverage threshold.
- Contract test giữa web/server; E2E cho flow lõi: onboarding → strategy → review → publish.
- Conventional commits + semantic release + changelog tự động.
- Môi trường tách biệt `dev/staging/prod` với promotion pipeline có approval.

6. **Observability chuẩn enterprise**
- OpenTelemetry đầy đủ trace xuyên suốt request → job → external API.
- Dashboard theo domain (content pipeline, wallet, source-discovery, publish).
- Alert theo business KPI, không chỉ hạ tầng (vd: tỷ lệ bài approved giảm bất thường).
- Correlation ID bắt buộc mọi log.

7. **Hạ tầng**
- IaC (Terraform/Pulumi) cho network, DB, object storage, secrets, monitoring.
- Chuẩn hóa `infra/` thành `infra/{env}/{network,compute,data,observability}`.
- Container hardening (non-root, image scan, SBOM, pinned base image).
- Blue/green hoặc rolling deploy với health check thật (readiness/liveness).

**Ưu tiên triển khai 90 ngày**
1. **30 ngày đầu**: security baseline + CI quality gate + observability cơ bản.  
2. **30 ngày tiếp**: queue hóa jobs + idempotency + DLQ + runbook.  
3. **30 ngày cuối**: IaC + staging parity + DR drill + audit/compliance controls.