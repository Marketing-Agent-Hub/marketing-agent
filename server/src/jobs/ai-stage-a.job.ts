import cron, { ScheduledTask } from 'node-cron';
import { processStageABatch } from '../services/ai-stage-a.service.js';

let aiStageAJobTask: ScheduledTask | null = null;

/**
 * Start the AI Stage A job
 * Runs every 10 minutes to process READY_FOR_AI items
 */
export function startAIStageAJob() {
    if (aiStageAJobTask) {
        console.log('[AI Stage A Job] Job already running');
        return;
    }

    // Run every 10 minutes
    // Cron pattern: minute hour day month weekday
    // */10 * * * * = every 10 minutes
    aiStageAJobTask = cron.schedule('*/10 * * * *', async () => {
        console.log('[AI Stage A Job] Starting scheduled AI Stage A processing...');
        try {
            await processStageABatch(5); // Process 5 items per batch
            console.log('[AI Stage A Job] Scheduled processing completed successfully');
        } catch (error) {
            console.error('[AI Stage A Job] Error during scheduled processing:', error);
        }
    });

    console.log('[AI Stage A Job] Started - running every 10 minutes');
}

/**
 * Stop the AI Stage A job
 */
export function stopAIStageAJob() {
    if (aiStageAJobTask) {
        aiStageAJobTask.stop();
        aiStageAJobTask = null;
        console.log('[AI Stage A Job] Stopped');
    }
}

/**
 * Trigger immediate AI Stage A processing (manual trigger)
 */
export async function triggerImmediateAIStageA(limit = 5) {
    console.log('[AI Stage A Job] Manual trigger - starting immediate processing...');
    try {
        const result = await processStageABatch(limit);
        console.log('[AI Stage A Job] Manual processing completed successfully');
        return result;
    } catch (error) {
        console.error('[AI Stage A Job] Error during manual processing:', error);
        throw error;
    }
}
