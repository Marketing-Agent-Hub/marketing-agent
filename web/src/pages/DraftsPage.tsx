import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { apiClient } from '../lib/api-client';
import { SharedNav } from '../components/SharedNav';
import type { ReadyItem } from '../types/api';

export function DraftsPage() {
    const [selectedItem, setSelectedItem] = useState<ReadyItem | null>(null);
    const [sortBy, setSortBy] = useState<'importance' | 'date' | 'recent'>('importance');
    const [topicTagFilter, setTopicTagFilter] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [limit] = useState(50);

    const { data: itemsData, isLoading, error } = useQuery({
        queryKey: ['ready-items', sortBy, topicTagFilter, fromDate, toDate, limit],
        queryFn: async () => {
            const result = await apiClient.getReadyItems({
                sortBy,
                topicTag: topicTagFilter || undefined,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                limit,
            });
            return result;
        },
        staleTime: 0, // Always fetch fresh data
        refetchOnMount: true,
    });

    const items = itemsData?.items || [];
    const total = itemsData?.total || 0;

    const handleViewDetail = (item: ReadyItem) => {
        setSelectedItem(item);
    };

    const handleCloseModal = () => {
        setSelectedItem(null);
    };

    const getContentPreview = (content: string) => {
        return content.substring(0, 200) + (content.length > 200 ? '...' : '');
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Sắp xếp theo:
                            </label>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="importance">⭐ Độ quan trọng</option>
                                <option value="date">📅 Ngày xuất bản</option>
                                <option value="recent">🕐 Mới nhất</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Topic Tag:
                            </label>
                            <select
                                value={topicTagFilter}
                                onChange={(e) => setTopicTagFilter(e.target.value)}
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
                                onChange={(e) => setFromDate(e.target.value)}
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
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {(topicTagFilter || fromDate || toDate) && (
                        <div className="mt-4 flex items-center gap-2">
                            <button
                                onClick={() => {
                                    setTopicTagFilter('');
                                    setFromDate('');
                                    setToDate('');
                                }}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                            >
                                🔄 Xóa bộ lọc
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats */}
                <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                    Hiển thị {items.length} / {total} bài viết
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
                                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        {/* Title */}
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                            {item.title}
                                        </h3>

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
                                            {item.importanceScore && (
                                                <span className="flex items-center gap-1 font-semibold text-orange-600 dark:text-orange-400">
                                                    ⭐ {item.importanceScore}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                🎯 Trust: {item.source.trustScore}
                                            </span>
                                        </div>

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

                            {/* Meta */}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <span>📰 {selectedItem.source.name}</span>
                                {selectedItem.publishedAt && (
                                    <span>📅 {new Date(selectedItem.publishedAt).toLocaleString('vi-VN')}</span>
                                )}
                                {selectedItem.importanceScore && (
                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                        ⭐ Importance: {selectedItem.importanceScore}
                                    </span>
                                )}
                                <span>🎯 Trust Score: {selectedItem.source.trustScore}</span>
                            </div>

                            {/* Tags */}
                            {selectedItem.topicTags && selectedItem.topicTags.length > 0 && (
                                <div className="mb-4">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Topic Tags:
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

                            {/* Full Article */}
                            {selectedItem.fullArticle && (
                                <div className="mb-4">
                                    <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Full Article (AI Generated):
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-900 dark:text-white whitespace-pre-line">
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
