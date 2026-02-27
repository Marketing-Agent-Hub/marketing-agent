import { Router } from 'express';
import authRoutes from './auth.routes';
import sourceRoutes from './source.routes';
import adminRoutes from './admin.routes';
import draftRoutes from './draft.routes';
import statsRoutes from './stats.routes';

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

export default router;
