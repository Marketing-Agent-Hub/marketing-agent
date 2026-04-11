import { Request, Response, NextFunction } from 'express';
import { PendingSourceStatus } from '@prisma/client';
import { db } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import {
    listPending,
    findPendingById,
    updatePendingStatus,
    mapPendingToSource,
} from './pending-source.repository.js';
import { isDiscoveryJobRunning, runDiscoveryJob } from '../../jobs/source-discovery.job.js';

export async function listPendingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
        const limit = Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20);
        const statusParam = req.query.status as string | undefined;

        let status: PendingSourceStatus | undefined;
        if (statusParam && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusParam)) {
            status = statusParam as PendingSourceStatus;
        }

        const { data, total } = await listPending({ status, page, limit });

        res.json({
            data,
            pagination: { page, limit, total },
        });
    } catch (error) {
        next(error);
    }
}

export async function approvePendingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, trustScore, topicTags, denyKeywords } = req.body ?? {};

        const pending = await findPendingById(id);
        if (!pending) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'PendingSource not found' } });
            return;
        }

        if (pending.status !== PendingSourceStatus.PENDING) {
            res.status(409).json({ error: { code: 'CONFLICT', message: `PendingSource is already ${pending.status}` } });
            return;
        }

        const existing = await db.source.findFirst({ where: { rssUrl: pending.feedUrl } });
        if (existing) {
            res.status(409).json({ error: { code: 'CONFLICT', message: 'Feed URL already exists in sources' } });
            return;
        }

        const sourceData = mapPendingToSource(pending, { name, trustScore, topicTags, denyKeywords });
        const source = await db.source.create({ data: sourceData });

        await updatePendingStatus(id, PendingSourceStatus.APPROVED);

        logger.info({ pendingId: id, sourceId: source.id }, '[SourceDiscovery] Approved');
        res.json(source);
    } catch (error) {
        next(error);
    }
}

export async function rejectPendingHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const id = parseInt(req.params.id, 10);
        const { rejectionReason } = req.body ?? {};

        const pending = await findPendingById(id);
        if (!pending) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'PendingSource not found' } });
            return;
        }

        if (pending.status !== PendingSourceStatus.PENDING) {
            res.status(409).json({ error: { code: 'CONFLICT', message: `PendingSource is already ${pending.status}` } });
            return;
        }

        await updatePendingStatus(id, PendingSourceStatus.REJECTED, rejectionReason);

        logger.info({ pendingId: id }, '[SourceDiscovery] Rejected');
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
}

export async function triggerDiscoveryJobHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (isDiscoveryJobRunning()) {
            res.status(409).json({ error: { code: 'CONFLICT', message: 'Job is already running' } });
            return;
        }

        res.status(202).json({ success: true, message: 'Discovery job started' });

        // Fire and forget — intentionally not awaited
        runDiscoveryJob().catch((err: unknown) => {
            logger.error({ err }, '[SourceDiscovery] Job failed');
        });
    } catch (error) {
        next(error);
    }
}
