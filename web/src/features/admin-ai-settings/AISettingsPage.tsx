import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const AI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-3-opus', 'claude-3-haiku'] as const;
type AIModel = (typeof AI_MODELS)[number];

interface PipelineStage {
    id: string;
    label: string;
    enabled: boolean;
    model: AIModel;
    similarityThreshold?: number;
}

interface AISettings {
    stages: PipelineStage[];
}

const stageSchema = z.object({
    id: z.string(),
    label: z.string(),
    enabled: z.boolean(),
    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-3-opus', 'claude-3-haiku']),
    similarityThreshold: z
        .number()
        .min(0, 'Must be >= 0')
        .max(1, 'Must be <= 1')
        .optional(),
});

const schema = z.object({
    stages: z.array(stageSchema),
});

type FormData = z.infer<typeof schema>;

const DEFAULT_STAGES: PipelineStage[] = [
    {
        id: 'stage_a_curator',
        label: 'Stage A  Curator',
        enabled: true,
        model: 'gpt-4o-mini',
        similarityThreshold: 0.6,
    },
    {
        id: 'stage_b_writer',
        label: 'Stage B  Writer',
        enabled: true,
        model: 'gpt-4o',
    },
    {
        id: 'stage_c_publisher',
        label: 'Stage C  Publisher',
        enabled: true,
        model: 'gpt-4o-mini',
    },
];

export default function AISettingsPage() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingData, setPendingData] = useState<FormData | null>(null);
    const qc = useQueryClient();

    const { data: settings, isLoading } = useQuery<AISettings>({
        queryKey: ['ai-settings'],
        queryFn: () =>
            apiClient.get('/api/internal/admin/ai/settings').then((r) => r.data.data),
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(schema) as any,
        defaultValues: { stages: DEFAULT_STAGES },
        values: { stages: settings?.stages ?? DEFAULT_STAGES },
    });

    const stages = watch('stages');

    const saveMutation = useMutation({
        mutationFn: (data: FormData) =>
            apiClient.patch('/api/internal/admin/ai/settings', data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['ai-settings'] });
            toast.success('AI settings updated successfully');
            setShowConfirm(false);
            setPendingData(null);
        },
    });

    const onSubmit = (data: FormData) => {
        setPendingData(data);
        setShowConfirm(true);
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl font-mono space-y-4">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className="h-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] animate-pulse"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="max-w-2xl font-mono">
            <div className="mb-6">
                <h1 className="text-sm font-bold text-[var(--color-text)]">AI Pipeline Settings</h1>
                <p className="text-xs text-[var(--color-text-muted)] opacity-50">
                    Configure model and parameters per pipeline stage
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {stages.map((stage, i) => (
                    <div
                        key={stage.id}
                        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 space-y-3 transition-colors"
                    >
                        {/* Stage header: label + toggle */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--color-text)]">
                                {stage.label}
                            </span>
                            <button
                                type="button"
                                aria-label={stage.enabled ? 'Disable stage' : 'Enable stage'}
                                onClick={() =>
                                    setValue(`stages.${i}.enabled`, !stage.enabled, {
                                        shouldDirty: true,
                                    })
                                }
                                className={`relative h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#4FACFE]/50 ${stage.enabled ? 'bg-[#4FACFE]' : 'bg-[var(--color-border)]'
                                    }`}
                            >
                                <span
                                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${stage.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Expanded controls when enabled */}
                        {stage.enabled && (
                            <>
                                {/* Model dropdown */}
                                <div>
                                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">
                                        Model
                                    </label>
                                    <select
                                        {...register(`stages.${i}.model`)}
                                        className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors"
                                    >
                                        {AI_MODELS.map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.stages?.[i]?.model && (
                                        <p className="mt-1 text-[10px] text-red-500">
                                            {errors.stages[i]?.model?.message}
                                        </p>
                                    )}
                                </div>

                                {/* Similarity threshold  only for stages that have it */}
                                {stage.similarityThreshold !== undefined && (
                                    <div>
                                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">
                                            Similarity Threshold
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="1"
                                            {...register(
                                                `stages.${i}.similarityThreshold`,
                                                { valueAsNumber: true }
                                            )}
                                            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors"
                                        />
                                        {errors.stages?.[i]?.similarityThreshold && (
                                            <p className="mt-1 text-[10px] text-red-500">
                                                {
                                                    errors.stages[i]?.similarityThreshold
                                                        ?.message
                                                }
                                            </p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}

                <Button type="submit" variant="ghost" className="w-full text-xs">
                    Save Configuration
                </Button>
            </form>

            <Modal
                open={showConfirm}
                onClose={() => {
                    setShowConfirm(false);
                    setPendingData(null);
                }}
                title="Confirm Pipeline Configuration Change"
                variant="destructive"
                confirmLabel="Save Changes"
                onConfirm={() => pendingData && saveMutation.mutate(pendingData)}
                confirmLoading={saveMutation.isPending}
            >
                <p className="text-xs">
                    This will affect the live AI pipeline. Are you sure you want to save
                    these changes?
                </p>
            </Modal>
        </div>
    );
}

