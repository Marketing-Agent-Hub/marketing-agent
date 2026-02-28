import { Router } from 'express';
import authRoutes from './auth.routes';
import sourceRoutes from './source.routes';
import adminRoutes from './admin.routes';
import draftRoutes from './draft.routes';
import statsRoutes from './stats.routes';
import monitorRoutes from './monitor.routes';
import itemRoutes from './item.routes';

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
