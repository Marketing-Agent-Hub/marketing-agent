import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<string, string> = {
    NEW: '📥 Mới',
    EXTRACTED: '📄 Đã trích xuất',
    FILTERED_OUT: '🚫 Đã lọc',
    READY_FOR_AI: '🤖 Sẵn sàng AI',
    AI_STAGE_A_DONE: '✨ AI Stage A',
    AI_STAGE_B_DONE: '💎 AI Stage B',
    USED_IN_POST: '📝 Đã dùng',
    REJECTED: '❌ Từ chối',
};

const POST_STATUS_LABELS: Record<string, string> = {
    DRAFT: '📝 Nháp',
    APPROVED: '✅ Đã duyệt',
    REJECTED: '❌ Từ chối',
    POSTED: '🚀 Đã đăng',
};

export function DashboardPage() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats'],
        queryFn: () => apiClient.getPipelineStats(),
        refetchInterval: 10000, // Auto-refresh every 10s
    });

    const { data: bottlenecks } = useQuery({
        queryKey: ['bottlenecks'],
        queryFn: () => apiClient.getBottlenecks(),
        refetchInterval: 30000, // Refresh every 30s
    });

    const { data: activity } = useQuery({
        queryKey: ['activity'],
        queryFn: () => apiClient.getRecentActivity(5),
        refetchInterval: 15000, // Refresh every 15s
    });

    const ingestMutation = useMutation({
        mutationFn: () => apiClient.triggerIngest(),
        onSuccess: () => {
            alert('✅ Đã trigger ingest job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
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
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const aiStageMutation = useMutation({
        mutationFn: (stage: 'A' | 'B') =>
            stage === 'A'
                ? apiClient.triggerAIStageA(5)
                : apiClient.triggerAIStageB(3),
        onSuccess: () => {
            alert('✅ Đã trigger AI job');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const digestMutation = useMutation({
        mutationFn: () => apiClient.triggerDigest(),
        onSuccess: () => {
            alert('✅ Đã trigger digest generation');
            queryClient.invalidateQueries({ queryKey: ['stats'] });
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    if (statsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Đang tải...</div>
            </div>
        );
    }

    const pipelineFlow = [
        { status: 'NEW', count: stats?.items.byStatus.NEW || 0, label: 'Mới', color: 'bg-blue-100 text-blue-800' },
        { status: 'EXTRACTED', count: stats?.items.byStatus.EXTRACTED || 0, label: 'Đã trích xuất', color: 'bg-purple-100 text-purple-800' },
        { status: 'READY_FOR_AI', count: stats?.items.byStatus.READY_FOR_AI || 0, label: 'Sẵn sàng AI', color: 'bg-yellow-100 text-yellow-800' },
        { status: 'AI_STAGE_A_DONE', count: stats?.items.byStatus.AI_STAGE_A_DONE || 0, label: 'AI Stage A', color: 'bg-indigo-100 text-indigo-800' },
        { status: 'AI_STAGE_B_DONE', count: stats?.items.byStatus.AI_STAGE_B_DONE || 0, label: 'AI Stage B', color: 'bg-pink-100 text-pink-800' },
        { status: 'USED_IN_POST', count: stats?.items.byStatus.USED_IN_POST || 0, label: 'Đã dùng', color: 'bg-green-100 text-green-800' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                📊 Dashboard
                            </h1>
                            <nav className="flex gap-4">
                                <a
                                    href="/dashboard"
                                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard
                                </a>
                                <a
                                    href="/sources"
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Nguồn RSS
                                </a>
                                <a
                                    href="/drafts"
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Bài viết
                                </a>
                                <a
                                    href="/monitoring"
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Monitoring
                                </a>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{user?.email}</span>
                            <button
                                onClick={logout}
                                className="text-sm text-gray-600 hover:text-gray-900"
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Bottlenecks Alert */}
                {bottlenecks && bottlenecks.bottlenecks.length > 0 && (
                    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                            ⚠️ Cần chú ý:
                        </h3>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {bottlenecks.bottlenecks.map((msg, i) => (
                                <li key={i}>• {msg}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl font-bold text-gray-900">
                            {stats?.sources.enabled || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Nguồn RSS đang hoạt động
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Tổng: {stats?.sources.total || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl font-bold text-gray-900">
                            {stats?.items.total || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Tổng items
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            24h gần đây: {stats?.items.recent24h || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl font-bold text-gray-900">
                            {stats?.posts.today || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Bài viết hôm nay
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            7 ngày: {stats?.posts.recent7days || 0}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-3xl font-bold text-gray-900">
                            {stats?.posts.byStatus.DRAFT || 0}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                            Bài nháp cần duyệt
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                            Đã duyệt: {stats?.posts.byStatus.APPROVED || 0}
                        </div>
                    </div>
                </div>

                {/* Pipeline Flow */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        🔄 Pipeline Flow
                    </h2>
                    <div className="flex items-center gap-2 overflow-x-auto pb-4">
                        {pipelineFlow.map((step, index) => (
                            <div key={step.status} className="flex items-center">
                                <div className="flex-shrink-0 text-center">
                                    <div className={`inline-block px-4 py-3 rounded-lg ${step.color}`}>
                                        <div className="text-2xl font-bold">{step.count}</div>
                                        <div className="text-xs mt-1">{step.label}</div>
                                    </div>
                                </div>
                                {index < pipelineFlow.length - 1 && (
                                    <div className="flex-shrink-0 mx-2 text-gray-400 text-2xl">→</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Manual Triggers */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        🎮 Manual Triggers
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <button
                            onClick={() => ingestMutation.mutate()}
                            disabled={ingestMutation.isPending}
                            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                            📥 Ingest
                        </button>
                        <button
                            onClick={() => extractionMutation.mutate()}
                            disabled={extractionMutation.isPending}
                            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                        >
                            📄 Extract
                        </button>
                        <button
                            onClick={() => filteringMutation.mutate()}
                            disabled={filteringMutation.isPending}
                            className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
                        >
                            🔍 Filter
                        </button>
                        <button
                            onClick={() => aiStageMutation.mutate('A')}
                            disabled={aiStageMutation.isPending}
                            className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                        >
                            ✨ AI Stage A
                        </button>
                        <button
                            onClick={() => aiStageMutation.mutate('B')}
                            disabled={aiStageMutation.isPending}
                            className="px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 text-sm font-medium"
                        >
                            💎 AI Stage B
                        </button>
                        <button
                            onClick={() => digestMutation.mutate()}
                            disabled={digestMutation.isPending}
                            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                            📝 Digest
                        </button>
                    </div>
                </div>

                {/* Item Status Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            📊 Item Status
                        </h2>
                        <div className="space-y-2">
                            {Object.entries(STATUS_LABELS).map(([status, label]) => {
                                const count = stats?.items.byStatus[status as keyof typeof stats.items.byStatus] || 0;
                                return (
                                    <div key={status} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{label}</span>
                                        <span className="text-sm font-medium text-gray-900">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">
                            📝 Post Status
                        </h2>
                        <div className="space-y-2">
                            {Object.entries(POST_STATUS_LABELS).map(([status, label]) => {
                                const count = stats?.posts.byStatus[status as keyof typeof stats.posts.byStatus] || 0;
                                return (
                                    <div key={status} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">{label}</span>
                                        <span className="text-sm font-medium text-gray-900">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                {activity && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                📰 Recent Items
                            </h2>
                            <div className="space-y-3">
                                {activity.items.map((item) => (
                                    <div key={item.id} className="text-sm border-b pb-2">
                                        <div className="font-medium text-gray-900 truncate">
                                            {item.title}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {item.source} • {STATUS_LABELS[item.status]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                📝 Recent Posts
                            </h2>
                            <div className="space-y-3">
                                {activity.posts.map((post) => (
                                    <div key={post.id} className="text-sm border-b pb-2">
                                        <div className="font-medium text-gray-900">
                                            {new Date(post.targetDate).toLocaleDateString('vi-VN')} - {post.timeSlot}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {POST_STATUS_LABELS[post.status]}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
