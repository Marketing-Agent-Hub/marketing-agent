import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ItemStatus } from '../types/api';
import { SharedNav } from '../components/SharedNav';

const STATUS_COLORS: Record<ItemStatus, string> = {
    NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    EXTRACTED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    FILTERED_OUT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    READY_FOR_AI: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    AI_STAGE_A_DONE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    AI_STAGE_B_DONE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    USED_IN_POST: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUS_LABELS: Record<ItemStatus, string> = {
    NEW: 'Mới',
    EXTRACTED: 'Đã trích xuất',
    FILTERED_OUT: 'Đã lọc',
    READY_FOR_AI: 'Sẵn sàng AI',
    AI_STAGE_A_DONE: 'AI Stage A xong',
    AI_STAGE_B_DONE: 'AI Stage B xong',
    USED_IN_POST: 'Đã dùng',
    REJECTED: 'Đã từ chối',
};

export function ItemsPage() {
    const [statusFilter, setStatusFilter] = useState<ItemStatus | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [limit] = useState(50);
    const [offset, setOffset] = useState(0);
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    // Fetch items
    const { data: itemsData, isLoading: itemsLoading } = useQuery({
        queryKey: ['items', statusFilter, searchQuery, limit, offset],
        queryFn: () => apiClient.getItems({
            status: statusFilter || undefined,
            search: searchQuery || undefined,
            limit,
            offset,
        }),
    });

    // Fetch stats
    const { data: statsData } = useQuery({
        queryKey: ['items-stats'],
        queryFn: () => apiClient.getItemsStats(),
    });

    // Fetch item detail
    const { data: itemDetail } = useQuery({
        queryKey: ['item', selectedItemId],
        queryFn: () => apiClient.getItemById(selectedItemId!),
        enabled: !!selectedItemId,
    });

    const items = itemsData?.items || [];
    const total = itemsData?.total || 0;
    const stats = {
        byStatus: statsData?.byStatus || {},
        recentCount: statsData?.recentCount || 0,
        filteredCount: statsData?.filteredCount || 0,
        rejectedCount: statsData?.rejectedCount || 0,
        total: statsData?.total || 0,
    };

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setOffset(0);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <SharedNav
                title="Quản lý Items"
                items={[
                    { label: 'Dashboard', href: '/' },
                    { label: 'Nguồn RSS', href: '/sources' },
                    { label: 'Bài viết', href: '/drafts' },
                    { label: 'Monitoring', href: '/monitoring' },
                    { label: 'Items', href: '/items', active: true },
                ]}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Tổng số</h3>
                        <div className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">24h gần đây</h3>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.recentCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Đã lọc</h3>
                        <div className="text-3xl font-bold text-gray-600 dark:text-gray-300">{stats.filteredCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Đã từ chối</h3>
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.rejectedCount.toLocaleString()}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Đã sử dụng</h3>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">{(stats.byStatus['USED_IN_POST'] || 0).toLocaleString()}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Trạng thái
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value as ItemStatus | '');
                                    setOffset(0);
                                }}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="">Tất cả</option>
                                <option value="NEW">Mới</option>
                                <option value="EXTRACTED">Đã trích xuất</option>
                                <option value="FILTERED_OUT">Đã lọc</option>
                                <option value="READY_FOR_AI">Sẵn sàng AI</option>
                                <option value="AI_STAGE_A_DONE">AI Stage A xong</option>
                                <option value="AI_STAGE_B_DONE">AI Stage B xong</option>
                                <option value="USED_IN_POST">Đã dùng</option>
                                <option value="REJECTED">Đã từ chối</option>
                            </select>
                        </div>

                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Tìm kiếm
                            </label>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Tìm theo tiêu đề, link..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                                >
                                    Tìm
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Danh sách Items ({total.toLocaleString()})
                        </h2>
                    </div>

                    {itemsLoading ? (
                        <div className="text-center py-12 text-gray-600 dark:text-gray-300">Đang tải...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Không tìm thấy item nào
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                ID
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Tiêu đề
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Nguồn
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Trạng thái
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                AI Stage
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Ngày tạo
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                                                Hành động
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {items.map((item) => {
                                            const latestAiResult = item.aiResults?.[0];
                                            const hasArticle = !!item.article;

                                            return (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {item.id}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                                                        <div className="max-w-md">
                                                            <div className="font-medium truncate">
                                                                {item.title}
                                                            </div>
                                                            {item.snippet && (
                                                                <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 truncate">
                                                                    {item.snippet}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {item.source?.name || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[item.status]}`}
                                                        >
                                                            {STATUS_LABELS[item.status]}
                                                        </span>
                                                        {item.filterReason && (
                                                            <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                                {item.filterReason}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                        {latestAiResult ? (
                                                            <div>
                                                                <span className="font-medium">Stage {latestAiResult.stage}</span>
                                                                {latestAiResult.stage === 'A' && (
                                                                    <div className="text-xs mt-1">
                                                                        <span className={latestAiResult.isAllowed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                                                            {latestAiResult.isAllowed ? '✓ Cho phép' : '✗ Từ chối'}
                                                                        </span>
                                                                        {latestAiResult.importanceScore && (
                                                                            <span className="ml-2 text-gray-600 dark:text-gray-300">
                                                                                Score: {latestAiResult.importanceScore}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <button
                                                            onClick={() => setSelectedItemId(item.id)}
                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                                                        >
                                                            Chi tiết
                                                        </button>
                                                        {hasArticle && (
                                                            <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                                                📄
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    Hiển thị {offset + 1} - {Math.min(offset + limit, total)} trong tổng số {total.toLocaleString()} items
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setOffset(Math.max(0, offset - limit))}
                                        disabled={offset === 0}
                                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>
                                    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
                                        Trang {currentPage} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setOffset(offset + limit)}
                                        disabled={offset + limit >= total}
                                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Item Detail Modal */}
            {selectedItemId && itemDetail && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Chi tiết Item #{itemDetail.id}</h2>
                            <button
                                onClick={() => setSelectedItemId(null)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Thông tin cơ bản</h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Nguồn:</span>
                                            <div className="text-gray-900 dark:text-white">{itemDetail.source?.name}</div>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Trạng thái:</span>
                                            <div>
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[itemDetail.status]}`}>
                                                    {STATUS_LABELS[itemDetail.status]}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Link:</span>
                                        <a href={itemDetail.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline block truncate">
                                            {itemDetail.link}
                                        </a>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ngày xuất bản:</span>
                                        <div className="text-gray-900 dark:text-white">
                                            {itemDetail.publishedAt ? new Date(itemDetail.publishedAt).toLocaleString('vi-VN') : '-'}
                                        </div>
                                    </div>
                                    {itemDetail.filterReason && (
                                        <div>
                                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Lý do lọc:</span>
                                            <div className="text-red-600 dark:text-red-400">{itemDetail.filterReason}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title and Snippet */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tiêu đề</h3>
                                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                    <p className="text-gray-900 dark:text-white font-medium">{itemDetail.title}</p>
                                    {itemDetail.snippet && (
                                        <p className="text-gray-600 dark:text-gray-300 mt-2">{itemDetail.snippet}</p>
                                    )}
                                </div>
                            </div>

                            {/* Article Content */}
                            {itemDetail.article && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Nội dung bài viết</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        {itemDetail.article.mainImageUrl && (
                                            <img
                                                src={itemDetail.article.mainImageUrl}
                                                alt="Article"
                                                className="w-full max-w-md mb-4 rounded"
                                            />
                                        )}
                                        <div className="prose max-w-none">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                {itemDetail.article.extractedContent}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Results */}
                            {itemDetail.aiResults && itemDetail.aiResults.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Kết quả AI</h3>
                                    <div className="space-y-4">
                                        {itemDetail.aiResults.map((result) => (
                                            <div key={result.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">AI Stage {result.stage}</h4>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {new Date(result.createdAt).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>

                                                {result.stage === 'A' && (
                                                    <div className="space-y-2">
                                                        <div>
                                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Kết quả:</span>
                                                            <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${result.isAllowed ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                                                                {result.isAllowed ? 'Cho phép' : 'Từ chối'}
                                                            </span>
                                                        </div>
                                                        {result.importanceScore && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Điểm quan trọng:</span>
                                                                <span className="ml-2 text-gray-900 dark:text-white">{result.importanceScore}/100</span>
                                                            </div>
                                                        )}
                                                        {result.topicTags.length > 0 && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tags:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {result.topicTags.map((tag, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {result.oneLineSummary && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tóm tắt 1 dòng:</span>
                                                                <p className="text-gray-900 dark:text-white mt-1">{result.oneLineSummary}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {result.stage === 'B' && (
                                                    <div className="space-y-3">
                                                        {result.summary && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tóm tắt:</span>
                                                                <p className="text-gray-900 dark:text-white mt-1">{result.summary}</p>
                                                            </div>
                                                        )}
                                                        {result.bullets.length > 0 && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Điểm chính:</span>
                                                                <ul className="list-disc list-inside mt-1 space-y-1">
                                                                    {result.bullets.map((bullet, idx) => (
                                                                        <li key={idx} className="text-gray-900 dark:text-white">{bullet}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {result.whyItMatters && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tại sao quan trọng:</span>
                                                                <p className="text-gray-900 dark:text-white mt-1">{result.whyItMatters}</p>
                                                            </div>
                                                        )}
                                                        {result.riskFlags.length > 0 && (
                                                            <div>
                                                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Cảnh báo rủi ro:</span>
                                                                <ul className="list-disc list-inside mt-1 space-y-1">
                                                                    {result.riskFlags.map((flag, idx) => (
                                                                        <li key={idx} className="text-red-600 dark:text-red-400">{flag}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {result.suggestedHashtags.length > 0 && (
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Hashtags:</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {result.suggestedHashtags.map((tag, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded text-xs">
                                                                            #{tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Token usage */}
                                                {result.totalTokens && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
                                                        Model: {result.model} | Tokens: {result.totalTokens.toLocaleString()}
                                                        ({result.promptTokens} prompt + {result.completionTokens} completion)
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
