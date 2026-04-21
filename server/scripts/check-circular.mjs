#!/usr/bin/env node
/**
 * Checks for circular dependencies in server/src using madge.
 * Exits with code 1 if any circular dependencies are found.
 * Requirements: 9.4, 9.5
 */
import madge from 'madge';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src');

const result = await madge(srcDir, {
    fileExtensions: ['ts'],
    tsConfig: join(__dirname, '..', 'tsconfig.json'),
    detectiveOptions: {
        ts: { skipTypeImports: true },
    },
});

const circular = result.circular();

if (circular.length === 0) {
    console.log('✅ No circular dependencies found.');
    process.exit(0);
} else {
    console.error(`❌ Found ${circular.length} circular dependency chain(s):\n`);
    for (const chain of circular) {
        console.error('  ' + chain.join(' → '));
    }
    process.exit(1);
}
