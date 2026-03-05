import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { apiClient } from '../lib/api-client';
import { SharedNav } from '../components/SharedNav';
import type { ReadyItem } from '../types/api';

export function DraftsPage() {
    const [selectedItem, setSelectedItem] = useState<ReadyItem | null>(null);
    const [sortBy, setSortBy] = useState<'importance' | 'date' | 'recent'>('importance');
    const [topicTagFilter, setTopicTagFilter] = useState('');
    const [sourceIdFilter, setSourceIdFilter] = useState<number | undefined>(undefined);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const queryClient = useQueryClient();

    const offset = (page - 1) * limit;

    const { data: itemsData, isLoading, error } = useQuery({
        queryKey: ['ready-items', page, sortBy, topicTagFilter, sourceIdFilter, fromDate, toDate, limit],
        queryFn: async () => {
            const result = await apiClient.getReadyItems({
                sortBy,
                topicTag: topicTagFilter || undefined,
                sourceId: sourceIdFilter,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                limit,
                offset,
            });
            return result;
        },
        staleTime: 3 * 60 * 1000,        // Cache 3 phút - AI content ít thay đổi
        gcTime: 10 * 60 * 1000,          // Giữ cache 10 phút
        placeholderData: keepPreviousData, // Giữ data cũ khi chuyển trang
        refetchOnWindowFocus: false,      // Không refetch khi focus window
        refetchOnMount: false,            // Không refetch khi remount
    });

    const items = itemsData?.items || [];
    const total = itemsData?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Get available sources for filter
    const { data: sourcesData } = useQuery({
        queryKey: ['sources-list'],
        queryFn: async () => {
            const result = await apiClient.getSources({ limit: 100, sortBy: 'name', sortOrder: 'asc' });
            return result.sources;
        },
        staleTime: 10 * 60 * 1000, // Cache sources for 10 minutes
    });

    const sources = sourcesData || [];

    const handleViewDetail = (item: ReadyItem) => {
        setSelectedItem(item);
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
    };

    const getContentPreview = (content: string) => {
        return content.substring(0, 200) + (content.length > 200 ? '...' : '');
    };

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (ids: number[]) => apiClient.deleteItems(ids),
        onSuccess: (data) => {
            toast.success(`✅ Đã xóa ${data.deleted} bài viết`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['ready-items'] });
        },
        onError: (error: Error) => {
            toast.error(`❌ Lỗi: ${error.message}`);
        },
    });

    // Delete all ready items mutation
    const deleteAllMutation = useMutation({
        mutationFn: () => apiClient.deleteAllReadyItems(),
        onSuccess: (data) => {
            toast.success(`✅ Đã xóa tất cả ${data.deleted} bài viết sẵn sàng`);
            setSelectedIds(new Set());
            queryClient.invalidateQueries({ queryKey: ['ready-items'] });
        },
        onError: (error: Error) => {
            toast.error(`❌ Lỗi: ${error.message}`);
        },
    });

    const handleToggleSelect = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        if (selectedIds.size === items.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(item => item.id)));
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        if (confirm(`Bạn có chắc muốn xóa ${selectedIds.size} bài viết đã chọn?`)) {
            deleteMutation.mutate(Array.from(selectedIds));
        }
    };

    const handleDeleteAll = () => {
        if (total === 0) return;

        if (confirm(`Bạn có chắc muốn xóa TẤT CẢ ${total} bài viết sẵn sàng? Hành động này không thể hoàn tác!`)) {
            toast.info('🔄 Đang xóa tất cả bài viết...');
            deleteAllMutation.mutate();
        }
    }

    // Filter handlers - reset to page 1 when filters change
    const handleFilterChange = () => {
        setPage(1);
        setSelectedIds(new Set());
    };

    const handleResetFilters = () => {
        setSortBy('importance');
        setTopicTagFilter('');
        setSourceIdFilter(undefined);
        setFromDate('');
        setToDate('');
        setPage(1);
        setSelectedIds(new Set());
    };

    // Get unique topic tags from items
    const allTopicTags = Array.from(
        new Set(items.flatMap(item => item.topicTags))
    ).sort();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-300">Đang tải bài viết...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-red-600 dark:text-red-400">Lỗi: {(error as Error).message}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <SharedNav />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        📰 Bài viết sẵn sàng đăng
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Các bài viết đã qua AI Stage B, sẵn sàng để publish lên Facebook
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sắp xếp theo:
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => {
                                    setSortBy(e.target.value as any);
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="importance">⭐ Độ quan trọng</option>
                                <option value="date">📅 Ngày xuất bản</option>
                                <option value="recent">🕐 Mới nhất</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Nguồn:
                            </label>
                            <select
                                value={sourceIdFilter || ''}
                                onChange={(e) => {
                                    setSourceIdFilter(e.target.value ? parseInt(e.target.value) : undefined);
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả nguồn</option>
                                {sources.map(source => (
                                    <option key={source.id} value={source.id}>{source.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Topic Tag:
                            </label>
                            <select
                                value={topicTagFilter}
                                onChange={(e) => {
                                    setTopicTagFilter(e.target.value);
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tất cả</option>
                                {allTopicTags.map(tag => (
                                    <option key={tag} value={tag}>{tag}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Từ ngày:
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => {
                                    setFromDate(e.target.value);
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Đến ngày:
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => {
                                    setToDate(e.target.value);
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {(topicTagFilter || sourceIdFilter || fromDate || toDate || sortBy !== 'importance') && (
                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={handleResetFilters}
                                className="text-sm px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                🔄 Xóa tất cả bộ lọc
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        Hiển thị {items.length === 0 ? '0' : `${offset + 1}-${Math.min(offset + items.length, total)}`} / {total} bài viết
                        {totalPages > 1 && ` (Trang ${page}/${totalPages})`}
                    </div>
                    <div className="flex items-center gap-3">
                        {items.length > 0 && (
                            <button
                                onClick={handleSelectAll}
                                className="text-sm px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                            >
                                {selectedIds.size === items.length ? '✓ Bỏ chọn tất cả' : '☐ Chọn tất cả'}
                            </button>
                        )}
                        {selectedIds.size > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                disabled={deleteMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleteMutation.isPending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xóa...
                                    </>
                                ) : (
                                    <>
                                        🗑️ Xóa đã chọn ({selectedIds.size})
                                    </>
                                )}
                            </button>
                        )}
                        {items.length > 0 && (
                            <button
                                onClick={handleDeleteAll}
                                disabled={deleteAllMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {deleteAllMutation.isPending ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xóa tất cả...
                                    </>
                                ) : (
                                    <>
                                        🗑️ Xóa tất cả ({total})
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Items List */}
                <div className="space-y-4">
                    {items.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center text-gray-500 dark:text-gray-400">
                            Không có bài viết nào sẵn sàng
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 ${selectedIds.has(item.id) ? 'ring-2 ring-blue-500' : ''}`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Checkbox */}
                                    <div className="shrink-0 pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => handleToggleSelect(item.id)}
                                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    {/* Thumbnail */}
                                    {(item.mainImageUrl || (item.imageList && item.imageList.length > 0)) && (
                                        <div className="shrink-0">
                                            <img
                                                src={item.mainImageUrl || (item.imageList && item.imageList[0]) || ''}
                                                alt={item.title}
                                                className="w-32 h-32 object-cover rounded-lg"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}

                                    <div className="flex-1">
                                        {/* Title */}
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {item.title}
                                        </h3>

                                        {/* One-line summary */}
                                        {item.oneLineSummary && (
                                            <p className="text-sm text-blue-600 dark:text-blue-400 italic mb-3">
                                                💡 {item.oneLineSummary}
                                            </p>
                                        )}

                                        {/* Meta info */}
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            <span className="flex items-center gap-1">
                                                📰 {item.source.name}
                                            </span>
                                            {item.publishedAt && (
                                                <span className="flex items-center gap-1">
                                                    📅 {new Date(item.publishedAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            )}
                                            {item.createdAt && (
                                                <span className="flex items-center gap-1 text-xs">
                                                    🕐 Nhận: {new Date(item.createdAt).toLocaleString('vi-VN')}
                                                </span>
                                            )}
                                            {item.importanceScore && (
                                                <span className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                                                    ⭐ {item.importanceScore}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                🎯 Trust: {item.source.trustScore}
                                            </span>
                                        </div>

                                        {/* AI Processing Info */}
                                        {(item.aiModel || item.aiProcessedAt) && (
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-500 mb-3">
                                                {item.aiModel && (
                                                    <span className="flex items-center gap-1">
                                                        🤖 {item.aiModel}
                                                    </span>
                                                )}
                                                {item.aiProcessedAt && (
                                                    <span className="flex items-center gap-1">
                                                        ⚡ AI: {new Date(item.aiProcessedAt).toLocaleString('vi-VN')}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Topic Tags */}
                                        {item.topicTags && item.topicTags.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {item.topicTags.map((tag, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Content preview */}
                                        {item.fullArticle && (
                                            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                                                {getContentPreview(item.fullArticle)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="ml-4 flex flex-col gap-2">
                                        <button
                                            onClick={() => handleViewDetail(item)}
                                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 whitespace-nowrap"
                                        >
                                            👁️ Xem chi tiết
                                        </button>
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-center whitespace-nowrap"
                                        >
                                            🔗 Nguồn gốc
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1 || isLoading}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            ← Trước
                        </button>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Trang {page} / {totalPages}
                        </div>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page >= totalPages || isLoading}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Chi tiết bài viết
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="px-6 py-4">
                            {/* Title */}
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {selectedItem.title}
                            </h2>

                            {/* Main Image */}
                            {(selectedItem.mainImageUrl || (selectedItem.imageList && selectedItem.imageList.length > 0)) && (
                                <div className="mb-4">
                                    <img
                                        src={selectedItem.mainImageUrl || (selectedItem.imageList && selectedItem.imageList[0]) || ''}
                                        alt={selectedItem.title}
                                        className="w-full max-h-96 object-cover rounded-lg"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            {/* One-line Summary */}
                            {selectedItem.oneLineSummary && (
                                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
                                        💡 Tóm tắt nhanh (AI Stage A):
                                    </div>
                                    <p className="text-blue-800 dark:text-blue-200">
                                        {selectedItem.oneLineSummary}
                                    </p>
                                </div>
                            )}

                            {/* Meta */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <span>📰 {selectedItem.source.name}</span>
                                {selectedItem.publishedAt && (
                                    <span>📅 Xuất bản: {new Date(selectedItem.publishedAt).toLocaleString('vi-VN')}</span>
                                )}
                                {selectedItem.createdAt && (
                                    <span>🕐 Nhận vào hệ thống: {new Date(selectedItem.createdAt).toLocaleString('vi-VN')}</span>
                                )}
                                {selectedItem.importanceScore && (
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                        ⭐ Importance: {selectedItem.importanceScore}
                                    </span>
                                )}
                                <span>🎯 Trust Score: {selectedItem.source.trustScore}</span>
                            </div>

                            {/* AI Processing Info */}
                            {(selectedItem.aiModel || selectedItem.aiProcessedAt) && (
                                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        🤖 Thông tin xử lý AI:
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                                        {selectedItem.aiModel && (
                                            <span>Model: {selectedItem.aiModel}</span>
                                        )}
                                        {selectedItem.aiProcessedAt && (
                                            <span>Thời gian xử lý: {new Date(selectedItem.aiProcessedAt).toLocaleString('vi-VN')}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {selectedItem.topicTags && selectedItem.topicTags.length > 0 && (
                                <div className="mb-4">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        🏷️ Topic Tags:
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedItem.topicTags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Image Gallery */}
                            {selectedItem.imageList && selectedItem.imageList.length > 1 && (
                                <div className="mb-4">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        🖼️ Hình ảnh ({selectedItem.imageList.length}):
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                        {selectedItem.imageList.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Image ${idx + 1}`}
                                                className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                                                onClick={() => window.open(img, '_blank')}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Full Article */}
                            {selectedItem.fullArticle && (
                                <div className="mb-4">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        📄 Bài viết Facebook đầy đủ (AI Stage B):
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-900 dark:text-white whitespace-pre-line border border-gray-200 dark:border-gray-700">
                                        {selectedItem.fullArticle}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                <a
                                    href={selectedItem.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    🔗 Xem nguồn gốc
                                </a>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(selectedItem.fullArticle || '');
                                        toast.success('✅ Đã copy nội dung!');
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                                >
                                    📋 Copy nội dung
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
