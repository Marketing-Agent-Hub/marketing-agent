import { Router } from 'express';
import { requireInternalAuth } from '../../middleware/internal-auth.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { jobScheduleService } from '../../jobs/job-schedule.service.js';
import { JOB_TYPES, JobType } from '../../jobs/job-schedule.types.js';
import { prisma } from '../../db/index.js';

const router = Router();

// GET /admin/job-schedules/defaults
router.get(
    '/defaults',
    requireInternalAuth,
    asyncHandler(async (_req, res) => {
        const defaults = await jobScheduleService.getDefaults();
        res.status(200).json({ defaults });
    }),
);

// PUT /admin/job-schedules/defaults/:jobType
router.put(
    '/defaults/:jobType',
    requireInternalAuth,
    asyncHandler(async (req, res) => {
        const { jobType } = req.params;

        if (!(JOB_TYPES as readonly string[]).includes(jobType)) {
            res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Invalid jobType: "${jobType}". Must be one of: ${JOB_TYPES.join(', ')}`,
                },
            });
            return;
        }

        const { cronExpression } = req.body;
        if (!cronExpression || typeof cronExpression !== 'string') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'cronExpression is required and must be a string' },
            });
            return;
        }

        await jobScheduleService.updateDefault(jobType as JobType, cronExpression);

        // Count brands that will be affected (those without custom schedule for this jobType)
        const totalBrands = await prisma.brand.count({ where: { status: 'ACTIVE' } });
        const customCount = await prisma.jobSchedule.count({ where: { jobType } });
        const affectedBrands = totalBrands - customCount;

        res.status(200).json({ jobType, cronExpression, affectedBrands });
    }),
);

export default router;
