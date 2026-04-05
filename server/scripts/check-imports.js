#!/usr/bin/env node
/**
 * check-imports.js
 *
 * Verifies that no forbidden legacy import patterns exist in src/.
 * Exits with code 1 if any violations are found.
 *
 * Forbidden patterns (legacy folders deleted in final-legacy-cleanup):
 *   - imports from src/controllers/
 *   - imports from src/services/  (business logic, not infra)
 *   - imports from src/schemas/   (domain schemas, not shared)
 *   - src/shared/* importing from src/domains/*
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC_DIR = new URL('../src', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

/** Patterns that must never appear in any import statement */
const FORBIDDEN = [
    {
        label: 'import from legacy controllers/',
        // matches: from '../../controllers/...' or from '../controllers/...'
        regex: /from\s+['"][^'"]*\/controllers\//,
        scope: 'src/',
    },
    {
        label: 'import from legacy services/ (business logic)',
        // matches relative paths like ../../services/ but NOT shared/marketing/schemas
        regex: /from\s+['"](?:\.\.\/)+services\//,
        scope: 'src/',
    },
    {
        label: 'import from legacy schemas/ (domain schemas)',
        // matches relative paths like ../../schemas/ but NOT shared/marketing/schemas
        regex: /from\s+['"](?:\.\.\/)+schemas\//,
        scope: 'src/',
    },
    {
        label: 'src/shared/* importing from src/domains/*',
        regex: /from\s+['"][^'"]*\/domains\//,
        scope: 'src/shared/',
    },
];

/** Recursively collect all .ts files under a directory */
function collectTs(dir) {
    const results = [];
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) {
            results.push(...collectTs(full));
        } else if (entry.endsWith('.ts')) {
            results.push(full);
        }
    }
    return results;
}

let violations = 0;

for (const rule of FORBIDDEN) {
    const scopeDir = join(SRC_DIR, '..', rule.scope);
    let files;
    try {
        files = collectTs(scopeDir);
    } catch {
        // scope dir doesn't exist — nothing to check
        continue;
    }

    for (const file of files) {
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, i) => {
            if (rule.regex.test(line)) {
                const rel = relative(join(SRC_DIR, '..'), file);
                console.error(`FORBIDDEN [${rule.label}]`);
                console.error(`  ${rel}:${i + 1}  ${line.trim()}`);
                violations++;
            }
        });
    }
}

if (violations > 0) {
    console.error(`\n${violations} forbidden import(s) found. Fix them before merging.`);
    process.exit(1);
} else {
    console.log('check:imports — OK (0 forbidden imports found)');
}
