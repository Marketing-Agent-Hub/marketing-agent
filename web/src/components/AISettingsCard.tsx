import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { apiClient } from '../lib/api-client';
import type { AISettings } from '../types/api';

export function AISettingsCard() {
    const queryClient = useQueryClient();

    // Fetch AI settings
    const { data: settings, isLoading } = useQuery<AISettings>({
        queryKey: ['ai-settings'],
        queryFn: () => apiClient.getAISettings(),
        staleTime: 30 * 1000,
    });

    // Stage A mutation
    const stageAMutation = useMutation({
        mutationFn: (enabled: boolean) => apiClient.updateAIStageA(enabled),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(`✅ ${response.data.message}`);
            }
            queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
        },
        onError: (error: Error) => {
            toast.error(`❌ Lỗi: ${error.message}`);
        },
    });

    // Stage B mutation
    const stageBMutation = useMutation({
        mutationFn: (enabled: boolean) => apiClient.updateAIStageB(enabled),
        onSuccess: (response) => {
            if (response.success) {
                toast.success(`✅ ${response.data.message}`);
            }
            queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
        },
        onError: (error: Error) => {
            toast.error(`❌ Lỗi: ${error.message}`);
        },
    });

    const handleToggleStageA = () => {
        stageAMutation.mutate(!settings?.stageA.enabled);
    };

    const handleToggleStageB = () => {
        stageBMutation.mutate(!settings?.stageB.enabled);
    };

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-900">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🤖</span>
                <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Settings</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Bật/tắt AI để tiết kiệm tokens
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Stage A Toggle */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">AI Stage A</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                Filtering
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {settings?.stageA.enabled
                                ? `🟢 ${settings.stageA.model} - ${settings.stageA.description}`
                                : '🔴 Heuristic filtering (no tokens)'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggleStageA}
                        disabled={stageAMutation.isPending}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings?.stageA.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            } ${stageAMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings?.stageA.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Stage B Toggle */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white">AI Stage B</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                Generation
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {settings?.stageB.enabled
                                ? `🟢 ${settings.stageB.model} - ${settings.stageB.description}`
                                : '🔴 Simple format (no tokens)'}
                        </p>
                    </div>
                    <button
                        onClick={handleToggleStageB}
                        disabled={stageBMutation.isPending}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings?.stageB.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            } ${stageBMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings?.stageB.enabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Cost indicator */}
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-400">💰</span>
                    <div className="text-xs text-amber-800 dark:text-amber-300">
                        <div className="font-semibold mb-1">Token Cost:</div>
                        <div>Stage A OFF + Stage B OFF = 0 tokens/article</div>
                        <div>Stage A OFF + Stage B ON ≈ 3,500 tokens/article</div>
                        <div>Both ON ≈ 4,000 tokens/article (~$0.024)</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
