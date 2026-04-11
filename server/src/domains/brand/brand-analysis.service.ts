import { z } from 'zod';
import { prisma } from '../../db/index.js';
import { aiClient } from '../../lib/ai-client.js';
import { callAIWorkflow } from '../../shared/marketing/ai-workflow.js';
import { getAIModel } from '../../shared/marketing/settings.js';
import { PROMPT_VERSIONS } from '../../shared/marketing/prompt-versions.js';

const businessAnalysisOutputSchema = z.object({
    summary: z.string().min(1),
    targetAudience: z.array(z.object({
        segment: z.string(),
        painPoints: z.array(z.string()),
    })),
    valueProps: z.array(z.string()),
    toneGuidelines: z.object({
        voice: z.string(),
        avoid: z.array(z.string()),
    }),
    businessGoals: z.array(z.string()),
    messagingAngles: z.array(z.string()),
    contentPillarCandidates: z.array(z.object({
        name: z.string(),
        description: z.string(),
    })),
});

type BusinessAnalysisOutput = z.infer<typeof businessAnalysisOutputSchema>;

export class BrandAnalysisService {
    async runBusinessAnalysis(brandId: number, sessionId: number) {
        const brand = await prisma.brand.findUnique({
            where: { id: brandId },
            include: { knowledgeDocs: true },
        });
        if (!brand) {
            throw new Error(`Brand ${brandId} không tồn tại`);
        }

        const session = await prisma.onboardingSession.findUnique({ where: { id: sessionId } });
        if (!session) {
            throw new Error(`Session ${sessionId} không tồn tại`);
        }

        const model = await getAIModel('businessAnalysis');
        const transcriptText = JSON.stringify(session.transcript, null, 2);
        const knowledgeText = brand.knowledgeDocs.map(doc => `[${doc.title}]\n${doc.content}`).join('\n\n');

        const systemPrompt = `You are a marketing strategist. Analyze the business onboarding interview and any provided documents to create a structured brand profile. Return ONLY valid JSON matching the specified schema.`;
        const userPrompt = `
## Onboarding Interview Transcript
${transcriptText}

${knowledgeText ? `## Additional Brand Documents\n${knowledgeText}` : ''}

## Required Output (JSON only)
{
  "summary": "Brief description of the business",
  "targetAudience": [{ "segment": "audience segment name", "painPoints": ["pain point 1"] }],
  "valueProps": ["value proposition 1"],
  "toneGuidelines": { "voice": "brand voice description", "avoid": ["thing to avoid"] },
  "businessGoals": ["goal 1"],
  "messagingAngles": ["angle 1"],
  "contentPillarCandidates": [{ "name": "pillar name", "description": "pillar description" }]
}`;

        const output = await callAIWorkflow<BusinessAnalysisOutput>({
            workspaceId: brand.workspaceId,
            brandId,
            workflow: 'business-analysis',
            model,
            promptVersion: PROMPT_VERSIONS.BUSINESS_ANALYSIS,
            inputSnapshot: {
                brandId,
                sessionId,
                transcriptLength: (session.transcript as any[]).length,
                knowledgeDocsCount: brand.knowledgeDocs.length,
            },
            callFn: async () => {
                const { data: response, actualModel } = await aiClient.chat({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    response_format: { type: 'json_object' },
                });

                const rawContent = response.choices[0].message.content ?? '{}';
                const validated = businessAnalysisOutputSchema.parse(JSON.parse(rawContent));

                return {
                    output: validated,
                    promptTokens: response.usage?.prompt_tokens ?? 0,
                    completionTokens: response.usage?.completion_tokens ?? 0,
                    rawResponse: rawContent,
                    actualModel,
                };
            },
        });

        await prisma.$transaction(async tx => {
            await tx.brandProfile.upsert({
                where: { brandId },
                create: {
                    brandId,
                    summary: output.summary,
                    targetAudience: output.targetAudience as any,
                    valueProps: output.valueProps as any,
                    toneGuidelines: output.toneGuidelines as any,
                    businessGoals: output.businessGoals as any,
                    messagingAngles: output.messagingAngles as any,
                },
                update: {
                    summary: output.summary,
                    targetAudience: output.targetAudience as any,
                    valueProps: output.valueProps as any,
                    toneGuidelines: output.toneGuidelines as any,
                    businessGoals: output.businessGoals as any,
                    messagingAngles: output.messagingAngles as any,
                },
            });

            await tx.contentPillar.deleteMany({ where: { brandId } });
            await tx.contentPillar.createMany({
                data: output.contentPillarCandidates.map(pillar => ({
                    brandId,
                    name: pillar.name,
                    description: pillar.description,
                })),
            });
        });

        return prisma.brandProfile.findUnique({
            where: { brandId },
            include: { brand: { include: { pillars: true } } },
        });
    }
}

export const brandAnalysisService = new BrandAnalysisService();
