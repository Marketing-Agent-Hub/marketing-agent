import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';
import { DraftEditor } from '../components/DraftEditor';
import type { DailyPost, PostStatus } from '../types/api';

const STATUS_LABELS: Record<PostStatus, string> = {
    DRAFT: '📝 Nháp',
    APPROVED: '✅ Đã duyệt',
    REJECTED: '❌ Đã từ chối',
    POSTED: '🚀 Đã đăng',
};

const STATUS_COLORS: Record<PostStatus, string> = {
    DRAFT: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    POSTED: 'bg-blue-100 text-blue-800',
};

const TIME_SLOT_LABELS: Record<string, string> = {
    MORNING_1: '08:00 - Sáng 1',
    MORNING_2: '08:00 - Sáng 2',
    NOON: '12:00 - Trưa',
    EVENING_1: '18:30 - Tối 1',
    EVENING_2: '18:30 - Tối 2',
};

export function DraftsPage() {
    const { user, logout } = useAuth();
    const [selectedDraft, setSelectedDraft] = useState<DailyPost | null>(null);
    const [statusFilter, setStatusFilter] = useState<PostStatus | 'ALL'>('DRAFT');
    const [dateFilter, setDateFilter] = useState('');

    const { data: drafts, isLoading, error } = useQuery({
        queryKey: ['drafts', statusFilter, dateFilter],
        queryFn: () => {
            const query: any = {};
            if (statusFilter !== 'ALL') query.status = statusFilter;
            if (dateFilter) query.targetDate = dateFilter;
            return apiClient.getDrafts(query);
        },
    });

    const handleEdit = (draft: DailyPost) => {
        setSelectedDraft(draft);
    };

    const handleCloseEditor = () => {
        setSelectedDraft(null);
    };

    const getContentPreview = (draft: DailyPost) => {
        const content = draft.editedContent || draft.content;
        return content.substring(0, 150) + (content.length > 150 ? '...' : '');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Đang tải bài viết...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-600">Lỗi: {(error as Error).message}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-8">
                            <h1 className="text-2xl font-bold text-gray-900">
                                Quản lý bài viết
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
                                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Nguồn RSS
                                </a>
                                <a
                                    href="/drafts"
                                    className="bg-blue-100 text-blue-700 px-3 py-2 rounded-md text-sm font-medium"
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

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Trạng thái:
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="ALL">Tất cả</option>
                                <option value="DRAFT">📝 Nháp</option>
                                <option value="APPROVED">✅ Đã duyệt</option>
                                <option value="REJECTED">❌ Đã từ chối</option>
                                <option value="POSTED">🚀 Đã đăng</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Ngày đăng:
                            </label>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Drafts List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {!drafts || drafts.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            Không có bài viết nào
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Ngày đăng
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Giờ đăng
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Trạng thái
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nội dung
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Nguồn tin
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {drafts.map((draft) => {
                                        const targetDate = new Date(draft.targetDate);
                                        const dateStr = targetDate.toLocaleDateString('vi-VN');

                                        return (
                                            <tr key={draft.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {dateStr}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {TIME_SLOT_LABELS[draft.timeSlot]}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[draft.status]
                                                            }`}
                                                    >
                                                        {STATUS_LABELS[draft.status]}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                                                    <div className="line-clamp-2">
                                                        {getContentPreview(draft)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {draft.postItems.length} tin
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleEdit(draft)}
                                                        className="text-blue-600 hover:text-blue-900"
                                                    >
                                                        {draft.status === 'DRAFT' ? '✏️ Chỉnh sửa' : '👁️ Xem'}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats */}
                {drafts && drafts.length > 0 && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {(['DRAFT', 'APPROVED', 'REJECTED', 'POSTED'] as PostStatus[]).map(
                            (status) => {
                                const count = drafts.filter((d) => d.status === status).length;
                                return (
                                    <div
                                        key={status}
                                        className="bg-white rounded-lg shadow p-4 text-center"
                                    >
                                        <div className="text-3xl font-bold text-gray-900">
                                            {count}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                            {STATUS_LABELS[status]}
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {selectedDraft && (
                <DraftEditor draft={selectedDraft} onClose={handleCloseEditor} />
            )}
        </div>
    );
}
