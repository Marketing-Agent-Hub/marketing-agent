import cron, { ScheduledTask } from 'node-cron';
import { processStageBBatch } from '../domains/content-intelligence/ai-stage-b.service.js';

let aiStageBJobTask: ScheduledTask | null = null;

/**
 * Start the AI Stage B job
 * Runs every 15 minutes to process AI_STAGE_A_DONE items
 */
export function startAIStageBJob() {
    if (aiStageBJobTask) {
        console.log('[AI Stage B Job] Job already running');
        return;
    }

    // Run every 15 minutes
    // Cron pattern: minute hour day month weekday
    // */15 * * * * = every 15 minutes
    aiStageBJobTask = cron.schedule('*/15 * * * *', async () => {
        console.log('[AI Stage B Job] Starting scheduled AI Stage B processing...');
        try {
            await processStageBBatch(3); // Process 3 items per batch (GPT-4o is expensive)
            console.log('[AI Stage B Job] Scheduled processing completed successfully');
        } catch (error) {
            console.error('[AI Stage B Job] Error during scheduled processing:', error);
        }
    });

    console.log('[AI Stage B Job] Started - running every 15 minutes');
}

/**
 * Stop the AI Stage B job
 */
export function stopAIStageBJob() {
    if (aiStageBJobTask) {
        aiStageBJobTask.stop();
        aiStageBJobTask = null;
        console.log('[AI Stage B Job] Stopped');
    }
}

/**
 * Trigger immediate AI Stage B processing (manual trigger)
 */
export async function triggerImmediateAIStageB(limit = 3) {
    console.log('[AI Stage B Job] Manual trigger - starting immediate processing...');
    try {
        const result = await processStageBBatch(limit);
        console.log('[AI Stage B Job] Manual processing completed successfully');
        return result;
    } catch (error) {
        console.error('[AI Stage B Job] Error during manual processing:', error);
        throw error;
    }
}

