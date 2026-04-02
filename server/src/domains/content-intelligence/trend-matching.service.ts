import { prisma } from '../../db/index.js';

function tokenize(values: Array<string | null | undefined>): Set<string> {
    const combined = values.filter(Boolean).join(' ').toLowerCase();
    return new Set(
        combined
            .split(/[^a-z0-9]+/i)
            .map(token => token.trim())
            .filter(token => token.length >= 3)
    );
}

function scoreMatch(brandTokens: Set<string>, signalTokens: Set<string>): number {
    let score = 0;
    for (const token of signalTokens) {
        if (brandTokens.has(token)) {
            score++;
        }
    }
    return score;
}

export class TrendMatchingService {
    async matchBrandToRecentSignals(brandId: number, lookbackDays = 3): Promise<number> {
        const prismaDynamic = prisma as any;
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: {
                profile: true,
                pillars: true,
            },
        });

        if (!brand) {
            return 0;
        }

        const lookback = new Date(Date.now() - lookbackDays * 86400000);
        const signals = await prismaDynamic.trendSignal.findMany({
            where: {
                OR: [
                    { publishedAt: { gte: lookback } },
                    { createdAt: { gte: lookback } },
                ],
            },
            orderBy: [{ importanceScore: 'desc' }, { publishedAt: 'desc' }],
            take: 50,
        });

        const brandTokens = tokenize([
            brand.name,
            brand.industry,
            brand.profile?.summary ?? '',
            ...brand.pillars.map(pillar => `${pillar.name} ${pillar.description ?? ''}`),
        ]);

        let matched = 0;

        for (const signal of signals) {
            const signalTokens = tokenize([
                signal.headline,
                signal.summary,
                signal.sourceName ?? '',
                ...signal.topicTags,
            ]);

            const relevanceScore = scoreMatch(brandTokens, signalTokens);
            if (relevanceScore < 2) {
                continue;
            }

            await prismaDynamic.brandTrendMatch.upsert({
                where: {
                    brandId_trendSignalId: {
                        brandId,
                        trendSignalId: signal.id,
                    },
                },
                create: {
                    brandId,
                    trendSignalId: signal.id,
                    relevanceScore,
                    reason: `Keyword overlap score ${relevanceScore}`,
                },
                update: {
                    relevanceScore,
                    reason: `Keyword overlap score ${relevanceScore}`,
                    matchedAt: new Date(),
                },
            });

            matched++;
        }

        return matched;
    }

    async getRecentMatchesForBrand(brandId: number, limit = 5) {
        const prismaDynamic = prisma as any;
        return prismaDynamic.brandTrendMatch.findMany({
            where: { brandId },
            include: { trendSignal: true },
            orderBy: [{ relevanceScore: 'desc' }, { matchedAt: 'desc' }],
            take: limit,
        });
    }
}

export const trendMatchingService = new TrendMatchingService();
