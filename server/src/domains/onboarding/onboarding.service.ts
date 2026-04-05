import { prisma } from '../../db/index.js';
import { logger } from '../../lib/logger.js';
import { AddMessageInput } from '../../shared/marketing/schemas/onboarding.schema.js';

interface TranscriptMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export class OnboardingService {
    async createSession(brandId: number) {
        return prisma.onboardingSession.create({
            data: {
                brandId,
                transcript: [],
                status: 'IN_PROGRESS',
            },
        });
    }

    async addMessage(sessionId: number, msg: AddMessageInput) {
        const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            const error = new Error('Session không tồn tại') as any;
            error.statusCode = 404;
            error.code = 'NOT_FOUND';
            throw error;
        }

        if (session.status !== 'IN_PROGRESS') {
            const error = new Error('Không thể thêm tin nhắn vào session đã hoàn thành') as any;
            error.statusCode = 422;
            error.code = 'INVALID_STATE_TRANSITION';
            throw error;
        }

        const transcript = (session.transcript as unknown as TranscriptMessage[]) ?? [];
        const newMessage: TranscriptMessage = {
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString(),
        };

        return prisma.onboardingSession.update({
            where: { id: sessionId },
            data: {
                transcript: [...transcript, newMessage] as any,
            },
        });
    }

    async completeSession(sessionId: number) {
        const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            const error = new Error('Session không tồn tại') as any;
            error.statusCode = 404;
            error.code = 'NOT_FOUND';
            throw error;
        }

        if (session.status !== 'IN_PROGRESS') {
            const error = new Error('Session đã hoàn thành') as any;
            error.statusCode = 422;
            error.code = 'INVALID_STATE_TRANSITION';
            throw error;
        }

        const transcript = (session.transcript as unknown as TranscriptMessage[]) ?? [];
        if (transcript.length === 0) {
            const error = new Error('Transcript không được để trống trước khi hoàn thành session') as any;
            error.statusCode = 422;
            error.code = 'VALIDATION_ERROR';
            throw error;
        }

        const completed = await prisma.onboardingSession.update({
            where: { id: sessionId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        setImmediate(async () => {
            try {
                const { runOnboardingAnalysisJob } = await import('../../jobs/marketing/onboarding-analysis.job.js');
                await runOnboardingAnalysisJob(session.brandId, sessionId);
            } catch (err) {
                logger.error({ err, brandId: session.brandId, sessionId }, 'Onboarding analysis job failed');
            }
        });

        return completed;
    }

    async getSession(sessionId: number) {
        const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            const error = new Error('Session không tồn tại') as any;
            error.statusCode = 404;
            error.code = 'NOT_FOUND';
            throw error;
        }
        return session;
    }
}

export const onboardingService = new OnboardingService();
