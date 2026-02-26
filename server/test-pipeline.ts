import { prisma } from './src/db/index.js';
import { ingestSource } from './src/services/ingest.service.js';
import { processNewItems } from './src/services/extraction.service.js';
import { filterExtractedItems } from './src/services/filtering.service.js';

/**
 * Test Pipeline Script
 * Tests the complete RSS → Extract → Filter pipeline
 */

async function testPipeline() {
    console.log('🧪 Starting Pipeline Test...\n');

    try {
        // Step 1: Check database connection
        console.log('📡 Step 1: Checking database connection...');
        await prisma.$connect();
        console.log('✅ Database connected\n');

        // Step 2: Find or create a test source
        console.log('📰 Step 2: Setting up test source...');
        let testSource = await prisma.source.findFirst({
            where: { enabled: true },
        });

        if (!testSource) {
            console.log('No enabled source found. Creating test source...');
            testSource = await prisma.source.create({
                data: {
                    name: 'Open Campus Blog (Test)',
                    rssUrl: 'https://www.opencampus.xyz/blog/rss.xml',
                    siteUrl: 'https://www.opencampus.xyz',
                    lang: 'EN',
                    topicTags: ['education', 'edtech', 'blockchain-tech', 'open-campus'],
                    trustScore: 90,
                    enabled: true,
                    fetchIntervalMinutes: 60,
                    denyKeywords: [],
                    notes: 'Test source for pipeline validation',
                },
            });
            console.log(`✅ Created test source: ${testSource.name} (ID: ${testSource.id})\n`);
        } else {
            console.log(`✅ Using existing source: ${testSource.name} (ID: ${testSource.id})\n`);
        }

        // Step 3: Trigger RSS Ingest
        console.log('📥 Step 3: Triggering RSS ingest...');
        const ingestResult = await ingestSource(testSource.id);
        console.log(`✅ Ingest complete:`);
        console.log(`   - Success: ${ingestResult.success}`);
        console.log(`   - New items: ${ingestResult.itemsCreated}`);
        console.log(`   - Duplicates: ${ingestResult.itemsExisting}`);
        if (ingestResult.error) {
            console.log(`   - Error: ${ingestResult.error}`);
        }
        console.log('');

        // Check items status
        const newItems = await prisma.item.findMany({
            where: { sourceId: testSource.id, status: 'NEW' },
            take: 5,
            select: { id: true, title: true, status: true },
        });
        console.log(`📊 Items with status NEW: ${newItems.length}`);
        newItems.forEach(item => {
            console.log(`   - [${item.id}] ${item.title.substring(0, 60)}...`);
        });
        console.log('');

        if (newItems.length === 0) {
            console.log('⚠️  No NEW items to process. Pipeline test complete.');
            return;
        }

        // Step 4: Trigger Content Extraction
        console.log('📄 Step 4: Triggering content extraction...');
        const extractionResult = await processNewItems(5);
        console.log(`✅ Extraction complete:`);
        console.log(`   - Processed: ${extractionResult.processed}`);
        console.log(`   - Errors: ${extractionResult.errors}`);
        console.log('');

        // Check extracted items
        const extractedItems = await prisma.item.findMany({
            where: { sourceId: testSource.id, status: 'EXTRACTED' },
            take: 5,
            select: { id: true, title: true, status: true },
        });
        console.log(`📊 Items with status EXTRACTED: ${extractedItems.length}`);
        extractedItems.forEach(item => {
            console.log(`   - [${item.id}] ${item.title.substring(0, 60)}...`);
        });
        console.log('');

        if (extractedItems.length === 0) {
            console.log('⚠️  No EXTRACTED items to filter. Check extraction logs for errors.');
            return;
        }

        // Step 5: Trigger Content Filtering
        console.log('🔍 Step 5: Triggering content filtering...');
        const filteringResult = await filterExtractedItems(5);
        console.log(`✅ Filtering complete:`);
        console.log(`   - Passed: ${filteringResult.passed}`);
        console.log(`   - Rejected: ${filteringResult.rejected}`);
        console.log('');

        // Check filtered items
        const readyForAI = await prisma.item.findMany({
            where: { sourceId: testSource.id, status: 'READY_FOR_AI' },
            take: 5,
            select: { id: true, title: true, status: true },
        });
        console.log(`📊 Items with status READY_FOR_AI: ${readyForAI.length}`);
        readyForAI.forEach(item => {
            console.log(`   - [${item.id}] ${item.title.substring(0, 60)}...`);
        });
        console.log('');

        const filteredOut = await prisma.item.findMany({
            where: { sourceId: testSource.id, status: 'FILTERED_OUT' },
            take: 5,
            select: { id: true, title: true, status: true, filterReason: true },
        });
        if (filteredOut.length > 0) {
            console.log(`📊 Items with status FILTERED_OUT: ${filteredOut.length}`);
            filteredOut.forEach(item => {
                console.log(`   - [${item.id}] ${item.title.substring(0, 60)}...`);
                console.log(`     Reason: ${item.filterReason}`);
            });
            console.log('');
        }

        // Step 6: Summary
        console.log('📈 Pipeline Test Summary:');
        const statusCounts = await prisma.item.groupBy({
            by: ['status'],
            where: { sourceId: testSource.id },
            _count: true,
        });
        statusCounts.forEach(stat => {
            console.log(`   - ${stat.status}: ${stat._count} items`);
        });
        console.log('');

        console.log('✅ Pipeline test completed successfully!');
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Review READY_FOR_AI items in database');
        console.log('   2. Setup AI Provider (OpenAI) for Stage A processing');
        console.log('   3. Continue with AI Stage B and Digest Generation');
        console.log('');

    } catch (error) {
        console.error('❌ Pipeline test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testPipeline()
    .then(() => {
        console.log('🎉 Test script completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test script failed:', error);
        process.exit(1);
    });
