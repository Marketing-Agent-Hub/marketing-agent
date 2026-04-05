import { prisma } from '../../db/index.js';

export type AIWorkflowName =
    | 'business-analysis'
    | 'strategy-generation'
    | 'brief-generation'
    | 'post-generation';

export interface AIWorkflowParams<T> {
    workspaceId: number;
    brandId: number;
    workflow: AIWorkflowName;
    model: string;
    promptVersion: string;
    inputSnapshot: unknown;
    callFn: () => Promise<{
        output: T;
        promptTokens: number;
        completionTokens: number;
        rawResponse: string;
    }>;
}

export async function callAIWorkflow<T>(params: AIWorkflowParams<T>): Promise<T> {
    const run = await prisma.generationRun.create({
        data: {
            workspaceId: params.workspaceId,
            brandId: params.brandId,
            workflow: params.workflow,
            model: params.model,
            promptVersion: params.promptVersion,
            status: 'RUNNING',
            inputSnapshot: params.inputSnapshot as any,
        },
    });

    try {
        const result = await params.callFn();

        await prisma.generationRun.update({
            where: { id: run.id },
            data: {
                status: 'COMPLETED',
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
                totalTokens: result.promptTokens + result.completionTokens,
                outputSnapshot: result.output as any,
                rawResponse: result.rawResponse,
            },
        });

        return result.output;
    } catch (error) {
        await prisma.generationRun.update({
            where: { id: run.id },
            data: { status: 'FAILED' },
        });
        throw error;
    }
}
