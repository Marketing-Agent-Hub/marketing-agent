import { Router } from 'express';
import productRoutes from './product/index.js';
import internalRoutes from './internal/index.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/', productRoutes);
router.use('/internal', internalRoutes);

export default router;

