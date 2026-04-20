import { Router } from 'express';
import { requireAdminAuth } from '../../middleware/admin-auth.js';
import * as monitorController from './monitoring.controller.js';

const router = Router();

// All monitoring routes require authentication
router.use(requireAdminAuth);

// Overview/Dashboard
router.get('/overview', monitorController.getMonitoringOverview);

// Metrics
router.get('/metrics', monitorController.getMetrics);
router.get('/metrics/stats', monitorController.getMetricStats);
router.get('/metrics/system', monitorController.getSystemMetrics);

// Health
router.get('/health', monitorController.getHealthStatus);
router.get('/health/history', monitorController.getHealthHistory);

// Traces
router.get('/traces', monitorController.getTraces);
router.get('/traces/slow', monitorController.getSlowTraces);
router.get('/traces/stats', monitorController.getTraceStats);
router.get('/traces/:traceId', monitorController.getTraceById);

export default router;
