import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireBrandAccess } from '../../middleware/brand-access.js';
import { onboardingController } from './onboarding.controller.js';

const router = Router({ mergeParams: true });

router.post('/generate', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) => onboardingController.generateProfile(req, res, next)));
router.post('/save', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) => onboardingController.saveProfile(req, res, next)));
// Session routes — kept for backward compatibility
router.post('/sessions', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) => onboardingController.createSession(req, res, next)));
router.get('/sessions/:sessionId', requireBrandAccess('VIEWER'), asyncHandler((req, res, next) => onboardingController.getSession(req, res, next)));
router.post('/sessions/:sessionId/messages', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) => onboardingController.addMessage(req, res, next)));
router.post('/sessions/:sessionId/complete', requireBrandAccess('EDITOR'), asyncHandler((req, res, next) => onboardingController.completeSession(req, res, next)));

export default router;
