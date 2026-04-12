import { Router } from 'express';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { jobScheduleService } from '../../jobs/job-schedule.service.js';
import { JOB_TYPES, JobType, ScheduleConfig } from '../../jobs/job-schedule.types.js';

const router = Router({ mergeParams: true });

// GET /brands/:brandId/job-schedules
router.get(
    '/',
    requireBrandAccess('ADMIN'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
        const schedules = await jobScheduleService.listEffective(brandId);
        res.status(200).json({ schedules });
    }),
);

// PUT /brands/:brandId/job-schedules/:jobType
router.put(
    '/:jobType',
    requireBrandAccess('ADMIN'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
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

        const { cronExpression, intervalMinutes, enabled } = req.body;

        if (typeof enabled !== 'boolean') {
            res.status(400).json({
                error: { code: 'VALIDATION_ERROR', message: 'enabled is required and must be a boolean' },
            });
            return;
        }

        const config: ScheduleConfig = { enabled };
        if (cronExpression !== undefined) config.cronExpression = cronExpression;
        if (intervalMinutes !== undefined) config.intervalMinutes = intervalMinutes;

        const resolved = jobScheduleService.validateAndResolve(config);
        if ('error' in resolved) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: resolved.error } });
            return;
        }

        const record = await jobScheduleService.upsert(brandId, jobType as JobType, config);
        res.status(200).json({ schedule: record });
    }),
);

// DELETE /brands/:brandId/job-schedules/:jobType
router.delete(
    '/:jobType',
    requireBrandAccess('ADMIN'),
    asyncHandler(async (req, res) => {
        const brandId = parseInt(req.params.brandId, 10);
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

        await jobScheduleService.remove(brandId, jobType as JobType);
        const effective = await jobScheduleService.getEffective(brandId, jobType as JobType);
        res.status(200).json({
            message: 'Schedule reset to global default',
            schedule: effective,
        });
    }),
);

export default router;
