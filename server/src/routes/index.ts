import { Router } from 'express';
import authRoutes from './auth.routes';
import sourceRoutes from './source.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/sources', sourceRoutes);

export default router;
