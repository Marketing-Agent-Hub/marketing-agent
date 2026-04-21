import fs from 'fs';
import path from 'path';
import { monitorConfig } from '../../../config/monitor.config.js';
import type { HealthProbe, HealthCheckResult } from '../health-aggregator.js';

/**
 * Checks filesystem read/write capability.
 * Requirements: 5.1
 */
export class FilesystemProbe implements HealthProbe {
    readonly name = 'filesystem';

    async check(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        try {
            const testFile = path.join(monitorConfig.logging.logDir, '.health-check');
            fs.writeFileSync(testFile, 'OK');
            const content = fs.readFileSync(testFile, 'utf-8');
            fs.unlinkSync(testFile);

            if (content !== 'OK') {
                throw new Error('File content mismatch');
            }

            return {
                service: this.name,
                status: 'HEALTHY',
                responseTime: Date.now() - startTime,
                message: 'Filesystem read/write OK',
            };
        } catch (error) {
            return {
                service: this.name,
                status: 'UNHEALTHY',
                responseTime: Date.now() - startTime,
                message: error instanceof Error ? error.message : 'Filesystem check failed',
            };
        }
    }
}

export const filesystemProbe = new FilesystemProbe();
