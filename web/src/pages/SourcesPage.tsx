import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useEffect } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { SourceFormModal } from '../components/SourceFormModal';
import { ImportSourcesModal } from '../components/ImportSourcesModal';
import type { Source } from '../types/api';

export function SourcesPage() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const [selectedSource, setSelectedSource] = useState<Source | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const { data: sources, isLoading, error } = useQuery({
        queryKey: ['sources'],
        queryFn: () => apiClient.getSources(),
    });

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

    const filteredSources = useMemo(() => {
        if (!sources) return [];
        if (!searchQuery.trim()) return sources;

        const query = searchQuery.toLowerCase();
        return sources.filter(
            (source) =>
                source.name.toLowerCase().includes(query) ||
                source.rssUrl.toLowerCase().includes(query) ||
                source.topicTags.some((tag) => tag.toLowerCase().includes(query))
        );
    }, [sources, searchQuery]);

    // Clear selection when search changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [searchQuery]);

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
        if (selectedIds.size === filteredSources.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSources.map(s => s.id)));
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
        alert(`✅ Đã xóa thành công!`);
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
        alert(`✅ Đã kích hoạt ${promises.length} nguồn!`);
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
        alert(`✅ Đã vô hiệu hóa ${promises.length} nguồn!`);
    };

    const handleBulkEdit = () => {
        if (selectedIds.size !== 1) {
            alert('⚠️ Chỉ có thể chỉnh sửa 1 nguồn tại một thời điểm!');
            return;
        }
        const id = Array.from(selectedIds)[0];
        const source = sources?.find(s => s.id === id);
        if (source) {
            handleEdit(source);
        }
    };

    const isAllSelected = filteredSources.length > 0 && selectedIds.size === filteredSources.length;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading sources...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">Error loading sources: {String(error)}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Quản lý nguồn RSS
                            </h1>
                            <nav className="flex gap-4">
                                <a
                                    href="/dashboard"
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard
                                </a>
                                <a
                                    href="/sources"
                                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
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
                                <a
                                    href="/items"
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Items
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
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-6 flex justify-between items-center">
                    <div className="flex-1 max-w-lg">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search sources by name, URL, or tag..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="ml-4 flex gap-3">
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                            📥 Import
                        </button>
                        <button
                            onClick={handleAdd}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            ➕ Add Source
                        </button>
                    </div>
                </div>

                {/* Selection Info & Bulk Actions */}
                {selectedIds.size > 0 ? (
                    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-blue-900">
                                    ✓ Đã chọn {selectedIds.size} nguồn
                                </span>
                                <button
                                    onClick={handleClearSelection}
                                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                                >
                                    Bỏ chọn tất cả
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleBulkEdit}
                                    disabled={selectedIds.size !== 1}
                                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ✏️ Sửa
                                </button>
                                <button
                                    onClick={handleBulkEnable}
                                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                >
                                    ✅ Kích hoạt
                                </button>
                                <button
                                    onClick={handleBulkDisable}
                                    className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                                >
                                    🚫 Vô hiệu hóa
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                >
                                    🗑️ Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-4 text-sm text-gray-600">
                        Showing {filteredSources.length} of {sources?.length || 0} sources
                    </div>
                )}

                {/* Sources Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    RSS URL
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Language
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trust Score
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSources.map((source) => (
                                <tr
                                    key={source.id}
                                    className={selectedIds.has(source.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(source.id)}
                                            onChange={() => handleSelectOne(source.id)}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {source.name}
                                        </div>
                                        {source.topicTags.length > 0 && (
                                            <div className="text-sm text-gray-500">
                                                {source.topicTags.join(', ')}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900 max-w-xs truncate">
                                            {source.rssUrl}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            {source.lang}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {source.trustScore}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleToggleEnabled(source.id, source.enabled)}
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer hover:opacity-80 ${source.enabled
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                                }`}
                                        >
                                            {source.enabled ? 'Enabled' : 'Disabled'}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(source)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(source.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredSources.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            {searchQuery ? 'No sources found matching your search.' : 'No sources yet. Click "Add Source" to create one.'}
                        </div>
                    )}
                </div>

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
