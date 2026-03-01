import cron, { ScheduledTask } from 'node-cron';
import { generateTomorrowPosts } from '../services/digest.service.js';

let digestJob: ScheduledTask | null = null;

/**
 * Start the digest generation cron job
 * Runs daily at 00:30 to generate posts for the next day
 */
export function startDigestJob(): void {
    if (digestJob) {
        console.log('[Digest Job] Already running');
        return;
    }

    // Run at 00:30 every day (0 30 0 * * *)
    digestJob = cron.schedule('0 30 0 * * *', async () => {
        console.log('[Digest Job] Starting daily digest generation...');
        try {
            await generateTomorrowPosts();
            console.log('[Digest Job] Completed successfully');
        } catch (error) {
            console.error('[Digest Job] Error generating digest:', error);
        }
    });

    console.log('[Digest Job] Started - will run daily at 00:30');
}

/**
 * Stop the digest generation cron job
 */
export function stopDigestJob(): void {
    if (digestJob) {
        digestJob.stop();
        digestJob = null;
        console.log('[Digest Job] Stopped');
    }
}

/**
 * Trigger immediate digest generation (for manual testing)
 */
export async function triggerImmediateDigest(dateStr?: string): Promise<void> {
    console.log('[Digest Job] Manual trigger initiated');

    if (dateStr) {
        const { generatePostsForDate } = await import('../services/digest.service.js');
        await generatePostsForDate(dateStr);
    } else {
        await generateTomorrowPosts();
    }

    console.log('[Digest Job] Manual trigger completed');
}

