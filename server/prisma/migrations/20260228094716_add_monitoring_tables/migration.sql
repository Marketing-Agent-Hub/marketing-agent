-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY');

-- CreateTable
CREATE TABLE "system_logs" (
    "id" SERIAL NOT NULL,
    "level" "LogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "service" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "duration" DOUBLE PRECISION,
    "traceId" TEXT,
    "spanId" TEXT,
    "userId" INTEGER,
    "error" TEXT,
    "stack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_metrics" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "labels" JSONB,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_checks" (
    "id" SERIAL NOT NULL,
    "service" TEXT NOT NULL,
    "status" "HealthStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "message" TEXT,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_traces" (
    "id" SERIAL NOT NULL,
    "traceId" TEXT NOT NULL,
    "spanId" TEXT,
    "parentSpanId" TEXT,
    "name" TEXT NOT NULL,
    "kind" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "statusCode" INTEGER,
    "method" TEXT,
    "path" TEXT,
    "attributes" JSONB,
    "events" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_service_idx" ON "system_logs"("service");

-- CreateIndex
CREATE INDEX "system_logs_traceId_idx" ON "system_logs"("traceId");

-- CreateIndex
CREATE INDEX "system_logs_createdAt_idx" ON "system_logs"("createdAt");

-- CreateIndex
CREATE INDEX "system_metrics_name_idx" ON "system_metrics"("name");

-- CreateIndex
CREATE INDEX "system_metrics_type_idx" ON "system_metrics"("type");

-- CreateIndex
CREATE INDEX "system_metrics_createdAt_idx" ON "system_metrics"("createdAt");

-- CreateIndex
CREATE INDEX "health_checks_service_idx" ON "health_checks"("service");

-- CreateIndex
CREATE INDEX "health_checks_status_idx" ON "health_checks"("status");

-- CreateIndex
CREATE INDEX "health_checks_checkedAt_idx" ON "health_checks"("checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "performance_traces_traceId_key" ON "performance_traces"("traceId");

-- CreateIndex
CREATE INDEX "performance_traces_traceId_idx" ON "performance_traces"("traceId");

-- CreateIndex
CREATE INDEX "performance_traces_name_idx" ON "performance_traces"("name");

-- CreateIndex
CREATE INDEX "performance_traces_startTime_idx" ON "performance_traces"("startTime");
