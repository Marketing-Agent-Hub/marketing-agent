import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface TriggerButton {
    key: string;
    label: string;
    icon: string;
    color: string;
    hoverColor: string;
    action: () => Promise<any>;
}

export function PipelineTriggers() {
    const queryClient = useQueryClient();

    const ingestMutation = useMutation({
        mutationFn: () => apiClient.triggerIngest(),
        onSuccess: () => {
            alert('✅ Đã trigger ingest job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const extractionMutation = useMutation({
        mutationFn: () => apiClient.triggerExtraction(10),
        onSuccess: () => {
            alert('✅ Đã trigger extraction job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const filteringMutation = useMutation({
        mutationFn: () => apiClient.triggerFiltering(10),
        onSuccess: () => {
            alert('✅ Đã trigger filtering job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const aiStageAMutation = useMutation({
        mutationFn: () => apiClient.triggerAIStageA(5),
        onSuccess: () => {
            alert('✅ Đã trigger AI Stage A job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const aiStageBMutation = useMutation({
        mutationFn: () => apiClient.triggerAIStageB(3),
        onSuccess: () => {
            alert('✅ Đã trigger AI Stage B job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const triggers: TriggerButton[] = [
        {
            key: 'ingest',
            label: 'Ingest',
            icon: '📥',
            color: 'bg-blue-600',
            hoverColor: 'hover:bg-blue-700',
            action: () => ingestMutation.mutateAsync(),
        },
        {
            key: 'extract',
            label: 'Extract',
            icon: '📄',
            color: 'bg-purple-600',
            hoverColor: 'hover:bg-purple-700',
            action: () => extractionMutation.mutateAsync(),
        },
        {
            key: 'filter',
            label: 'Filter',
            icon: '🔍',
            color: 'bg-yellow-600',
            hoverColor: 'hover:bg-yellow-700',
            action: () => filteringMutation.mutateAsync(),
        },
        {
            key: 'ai-a',
            label: 'AI Stage A',
            icon: '✨',
            color: 'bg-indigo-600',
            hoverColor: 'hover:bg-indigo-700',
            action: () => aiStageAMutation.mutateAsync(),
        },
        {
            key: 'ai-b',
            label: 'AI Stage B',
            icon: '💎',
            color: 'bg-pink-600',
            hoverColor: 'hover:bg-pink-700',
            action: () => aiStageBMutation.mutateAsync(),
        },
    ];

    const isAnyPending =
        ingestMutation.isPending ||
        extractionMutation.isPending ||
        filteringMutation.isPending ||
        aiStageAMutation.isPending ||
        aiStageBMutation.isPending;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🎮 Manual Triggers
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {triggers.map((trigger) => (
                    <button
                        key={trigger.key}
                        onClick={() => trigger.action()}
                        disabled={isAnyPending}
                        className={`px-4 py-3 ${trigger.color} text-white rounded-lg ${trigger.hoverColor} disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors`}
                    >
                        {trigger.icon} {trigger.label}
                    </button>
                ))}
            </div>
            {isAnyPending && (
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Processing...
                </div>
            )}
        </div>
    );
}
