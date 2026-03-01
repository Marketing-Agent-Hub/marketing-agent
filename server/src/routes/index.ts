import { Router } from 'express';
import authRoutes from './auth.routes.js';
import sourceRoutes from './source.routes.js';
import adminRoutes from './admin.routes.js';
import draftRoutes from './draft.routes.js';
import statsRoutes from './stats.routes.js';
import monitorRoutes from './monitor.routes.js';
import itemRoutes from './item.routes.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/sources', sourceRoutes);
router.use('/admin', adminRoutes);
router.use('/drafts', draftRoutes);
router.use('/stats', statsRoutes);
router.use('/monitor', monitorRoutes);
router.use('/items', itemRoutes);

export default router;

