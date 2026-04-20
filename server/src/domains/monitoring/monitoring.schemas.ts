import { z } from 'zod';

export const getMetricsSchema = z.object({
    name: z.string().optional(),
    type: z.enum(['COUNTER', 'GAUGE', 'HISTOGRAM', 'SUMMARY']).optional(),
    limit: z.coerce.number().min(1).max(500).default(100),
    offset: z.coerce.number().min(0).default(0),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

export const getMetricStatsSchema = z.object({
    name: z.string().min(1),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});

export const getTracesSchema = z.object({
    traceId: z.string().optional(),
    name: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(100),
    offset: z.coerce.number().min(0).default(0),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minDuration: z.coerce.number().min(0).optional(),
});

export const getHealthHistorySchema = z.object({
    service: z.string().optional(),
    limit: z.coerce.number().min(1).max(500).default(100),
    offset: z.coerce.number().min(0).default(0),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
});
