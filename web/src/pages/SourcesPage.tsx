import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { apiClient } from '../lib/api-client';
import { SourceFormModal } from '../components/SourceFormModal';
import { ImportSourcesModal } from '../components/ImportSourcesModal';
import { SharedNav } from '../components/SharedNav';
import type { Source, SourceLang } from '../types/api';

export function SourcesPage() {
    const queryClient = useQueryClient();
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Pagination & Filters
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [enabledFilter, setEnabledFilter] = useState<boolean | undefined>(undefined);
    const [langFilter, setLangFilter] = useState<SourceLang | undefined>(undefined);
    const [minTrustScore, setMinTrustScore] = useState<number | undefined>(undefined);
    const [sortBy, setSortBy] = useState<'name' | 'trustScore' | 'createdAt' | 'enabled'>('trustScore');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const offset = (page - 1) * limit;

    const { data: sourcesData, isLoading, error } = useQuery<{ sources: Source[]; total: number; limit: number; offset: number }>({
        queryKey: ['sources', page, searchQuery, enabledFilter, langFilter, minTrustScore, sortBy, sortOrder],
        queryFn: () => apiClient.getSources({
            limit,
            offset,
            search: searchQuery || undefined,
            enabled: enabledFilter,
            lang: langFilter || undefined,
            minTrustScore: minTrustScore || undefined,
            sortBy,
            sortOrder,
        }),
        staleTime: 5 * 60 * 1000,        // Cache 5 phút - không refetch nếu data còn fresh
        gcTime: 10 * 60 * 1000,          // Giữ cache trong 10 phút khi không dùng
        placeholderData: keepPreviousData, // Giữ data cũ khi chuyển trang (UX mượt)
        refetchOnWindowFocus: false,      // Không refetch khi focus window
        refetchOnMount: false,            // Không refetch khi component remount
    });

    const sources = sourcesData?.sources || [];
    const total = sourcesData?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiClient.deleteSource(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] });
        },
    });

    const toggleEnabledMutation = useMutation({
        mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
            apiClient.updateSource(id, { enabled }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] });
        },
    });

    // Clear selection when filters change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [page, searchQuery, enabledFilter, langFilter, minTrustScore, sortBy, sortOrder]);

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this source?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleToggleEnabled = (id: number, currentEnabled: boolean) => {
        toggleEnabledMutation.mutate({ id, enabled: !currentEnabled });
    };

    const handleEdit = (source: Source) => {
        setSelectedSource(source);
        setShowModal(true);
    };

    const handleAdd = () => {
        setSelectedSource(null);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSource(null);
    };

    // Selection handlers
    const handleSelectAll = () => {
        if (selectedIds.size === sources.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(sources.map(s => s.id)));
        }
    };

    const handleSelectOne = (id: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleClearSelection = () => {
        setSelectedIds(new Set());
    };

    // Bulk actions
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        const confirmed = confirm(`Bạn có chắc muốn xóa ${selectedIds.size} nguồn RSS?`);
        if (!confirmed) return;

        const promises = Array.from(selectedIds).map(id =>
            apiClient.deleteSource(id).catch(err => {
                console.error(`Failed to delete source ${id}:`, err);
                return null;
            })
        );

        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        setSelectedIds(new Set());
        toast.success(`✅ Đã xóa thành công!`);
    };

    const handleBulkEnable = async () => {
        if (selectedIds.size === 0) return;

        const promises = Array.from(selectedIds).map(id =>
            apiClient.updateSource(id, { enabled: true }).catch(err => {
                console.error(`Failed to enable source ${id}:`, err);
                return null;
            })
        );

        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        setSelectedIds(new Set());
        toast.success(`✅ Đã kích hoạt ${promises.length} nguồn!`);
    };

    const handleBulkDisable = async () => {
        if (selectedIds.size === 0) return;

        const promises = Array.from(selectedIds).map(id =>
            apiClient.updateSource(id, { enabled: false }).catch(err => {
                console.error(`Failed to disable source ${id}:`, err);
                return null;
            })
        );

        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['sources'] });
        setSelectedIds(new Set());
        toast.success(`✅ Đã vô hiệu hóa ${promises.length} nguồn!`);
    };

    const handleBulkEdit = () => {
        if (selectedIds.size !== 1) {
            toast.warning('⚠️ Chỉ có thể chỉnh sửa 1 nguồn tại một thời điểm!');
            return;
        }
        const id = Array.from(selectedIds)[0];
        const source = sources?.find(s => s.id === id);
        if (source) {
            handleEdit(source);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await apiClient.exportSources();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sources-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('❌ Export thất bại. Vui lòng thử lại!');
        }
    };

    // Reset to page 1 when filters change
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setPage(1);
    };

    const handleFilterChange = () => {
        setPage(1);
    };

    const isAllSelected = sources.length > 0 && selectedIds.size === sources.length;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-gray-600 dark:text-gray-300">Loading sources...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-red-600 dark:text-red-400">Error loading sources: {String(error)}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <SharedNav />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12">
                {/* Filters Section */}
                <div className="mb-6 space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                    {/* Filter Controls Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Trạng thái
                            </label>
                            <select
                                value={enabledFilter === undefined ? 'all' : enabledFilter ? 'enabled' : 'disabled'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setEnabledFilter(val === 'all' ? undefined : val === 'enabled');
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Tất cả</option>
                                <option value="enabled">Đã bật</option>
                                <option value="disabled">Đã tắt</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ngôn ngữ
                            </label>
                            <select
                                value={langFilter || 'all'}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLangFilter(val === 'all' ? undefined : val as 'VI' | 'EN' | 'MIXED');
                                    handleFilterChange();
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="all">Tất cả</option>
                                <option value="VI">VI</option>
                                <option value="EN">EN</option>
                                <option value="MIXED">MIXED</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Trust Score tối thiểu
                            </label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={minTrustScore || ''}
                                onChange={(e) => {
                                    const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                    setMinTrustScore(val);
                                    handleFilterChange();
                                }}
                                placeholder="0-100"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Sắp xếp theo
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as 'name' | 'trustScore' | 'createdAt' | 'enabled')}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="name">Tên</option>
                                    <option value="trustScore">Trust Score</option>
                                    <option value="createdAt">Ngày tạo</option>
                                    <option value="enabled">Trạng thái</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                                >
                                    {sortOrder === 'asc' ? '⬆️' : '⬇️'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search and Actions Row */}
                    <div className="flex justify-between items-center gap-4">
                        <div className="flex-1 max-w-lg">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Tìm kiếm theo tên, URL, ghi chú..."
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                                📥 Import
                            </button>
                            <button
                                onClick={handleExport}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                📤 Export
                            </button>
                            <button
                                onClick={handleAdd}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                ➕ Add Source
                            </button>
                        </div>
                    </div>
                </div>

                {/* Selection Info & Bulk Actions */}
                {selectedIds.size > 0 ? (
                    <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                                    ✓ Đã chọn {selectedIds.size} nguồn
                                </span>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                                >
                                    Bỏ chọn tất cả
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkEdit}
                                    disabled={selectedIds.size !== 1}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✏️ Sửa
                                </button>
                                <button
                                    onClick={handleBulkEnable}
                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                >
                                    ✅ Kích hoạt
                                </button>
                                <button
                                    onClick={handleBulkDisable}
                                    className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
                                >
                                    🚫 Vô hiệu hóa
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                                >
                                    🗑️ Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                        Hiển thị {sources.length === 0 ? '0' : `${offset + 1}-${Math.min(offset + sources.length, total)}`} / {total} nguồn
                    </div>
                )}

                {/* Sources Table */}
                <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                        title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    RSS URL
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Language
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Trust Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {sources.map((source) => (
                                <tr
                                    key={source.id}
                                    className={selectedIds.has(source.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(source.id)}
                                            onChange={() => handleSelectOne(source.id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {source.name}
                                        </div>
                                        {source.topicTags.length > 0 && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                {source.topicTags.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                            {source.rssUrl}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                            {source.lang}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                        {source.trustScore}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleEnabled(source.id, source.enabled)}
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${source.enabled
                                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                                }`}
                                        >
                                            {source.enabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(source)}
                                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(source.id)}
                                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {sources.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            {searchQuery ? 'Không tìm thấy nguồn nào.' : 'Chưa có nguồn nào. Nhấn "Add Source" để tạo mới.'}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow">
                        <button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1 || isLoading}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            ← Trước
                        </button>
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            Trang {page} / {totalPages}
                        </div>
                        <button
                            onClick={() => setPage(page + 1)}
                            disabled={page >= totalPages || isLoading}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Sau →
                        </button>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <SourceFormModal
                        source={selectedSource}
                        onClose={handleCloseModal}
                    />
                )}

                {/* Import Modal */}
                {showImportModal && (
                    <ImportSourcesModal
                        onClose={() => setShowImportModal(false)}
                    />
                )}
            </main>
        </div>
    );
}
