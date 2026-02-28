import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as monitorController from '../controllers/monitor.controller';

const router = Router();

// All monitoring routes require authentication
router.use(requireAuth);

// Overview/Dashboard
router.get('/overview', monitorController.getMonitoringOverview);

// Logs
router.get('/logs', monitorController.getLogs);
router.get('/logs/stats', monitorController.getLogStats);

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
