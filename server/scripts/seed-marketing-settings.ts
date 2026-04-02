/**
 * Seed script for marketing agent namespaced settings
 * Usage: tsx scripts/seed-marketing-settings.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MARKETING_SETTINGS = [
    {
        key: 'marketing.models.businessAnalysis',
        value: 'gpt-4o-mini',
        description: 'AI model for business analysis workflow',
    },
    {
        key: 'marketing.models.strategyGeneration',
        value: 'gpt-4o',
        description: 'AI model for strategy generation workflow',
    },
    {
        key: 'marketing.models.postGeneration',
        value: 'gpt-4o',
        description: 'AI model for post generation workflow',
    },
    {
        key: 'marketing.defaults.reviewRequired',
        value: 'true',
        description: 'Require manual review before publishing (true/false)',
    },
    {
        key: 'marketing.defaults.postingCadence',
        value: '5',
        description: 'Default number of posts per week',
    },
    {
        key: 'social.publish.retryLimit',
        value: '3',
        description: 'Number of retry attempts for failed publish jobs',
    },
];

async function seed() {
    console.log('Seeding marketing settings...');

    for (const setting of MARKETING_SETTINGS) {
        await prisma.setting.upsert({
            where: { key: setting.key },
            update: { description: setting.description },
            create: {
                key: setting.key,
                value: setting.value,
                description: setting.description,
            },
        });
        console.log(`  ✓ ${setting.key} = ${setting.value}`);
    }

    console.log(`\nSeeded ${MARKETING_SETTINGS.length} settings successfully.`);
}

seed()
    .catch((error) => {
        console.error('Seed failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
