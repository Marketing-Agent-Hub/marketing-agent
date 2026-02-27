import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { DailyPost } from '../types/api';

interface DraftEditorProps {
    draft: DailyPost;
    onClose: () => void;
}

const TIME_SLOT_LABELS: Record<string, string> = {
    MORNING_1: '08:00 - Sáng 1',
    MORNING_2: '08:00 - Sáng 2',
    NOON: '12:00 - Trưa',
    EVENING_1: '18:30 - Tối 1',
    EVENING_2: '18:30 - Tối 2',
};

export function DraftEditor({ draft, onClose }: DraftEditorProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'hook' | 'bullets' | 'ocvn' | 'cta' | 'hashtags' | 'preview'>('preview');

    const [hookText, setHookText] = useState(draft.hookText || '');
    const [bulletsText, setBulletsText] = useState(draft.bulletsText || '');
    const [ocvnTakeText, setOcvnTakeText] = useState(draft.ocvnTakeText || '');
    const [ctaText, setCtaText] = useState(draft.ctaText || '');
    const [hashtags, setHashtags] = useState(draft.hashtags.join(' '));

    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    useEffect(() => {
        setHookText(draft.hookText || '');
        setBulletsText(draft.bulletsText || '');
        setOcvnTakeText(draft.ocvnTakeText || '');
        setCtaText(draft.ctaText || '');
        setHashtags(draft.hashtags.join(' '));
    }, [draft]);

    const updateMutation = useMutation({
        mutationFn: (data: any) => apiClient.updateDraft(draft.id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            alert('✅ Đã lưu thay đổi');
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const approveMutation = useMutation({
        mutationFn: () => apiClient.approveDraft(draft.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            alert('✅ Đã duyệt bài viết');
            onClose();
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (reason: string) => apiClient.rejectDraft(draft.id, { rejectionReason: reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            alert('✅ Đã từ chối bài viết');
            onClose();
        },
        onError: (error: any) => {
            alert(`❌ Lỗi: ${error.message}`);
        },
    });

    const handleSave = () => {
        const hashtagsArray = hashtags
            .split(/\s+/)
            .filter(tag => tag.startsWith('#'))
            .map(tag => tag.replace('#', ''));

        updateMutation.mutate({
            hookText,
            bulletsText,
            ocvnTakeText,
            ctaText,
            hashtags: hashtagsArray,
        });
    };

    const handleApprove = () => {
        if (confirm('Bạn có chắc muốn duyệt bài viết này?')) {
            approveMutation.mutate();
        }
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            alert('Vui lòng nhập lý do từ chối');
            return;
        }
        rejectMutation.mutate(rejectionReason);
        setShowRejectDialog(false);
    };

    const finalContent = draft.editedContent || draft.content;
    const previewContent = `${hookText}\n\n${bulletsText}\n\n${ocvnTakeText}\n\n${ctaText}\n\n${hashtags}`;

    const targetDateFormatted = new Date(draft.targetDate).toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Chỉnh sửa bài viết
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {targetDateFormatted} - {TIME_SLOT_LABELS[draft.timeSlot]}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b">
                    <div className="flex overflow-x-auto px-6">
                        {[
                            { id: 'preview', label: '👁️ Xem trước' },
                            { id: 'hook', label: '📢 Hook' },
                            { id: 'bullets', label: '📝 Bullets' },
                            { id: 'ocvn', label: '💼 OCVN Take' },
                            { id: 'cta', label: '📣 CTA' },
                            { id: 'hashtags', label: '#️⃣ Hashtags' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'preview' && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-gray-700 mb-2">Nội dung đầy đủ:</h3>
                                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                                    {previewContent || finalContent}
                                </pre>
                            </div>
                            <div className="text-sm text-gray-600">
                                <p className="mb-2"><strong>Nguồn tin:</strong></p>
                                <ul className="list-disc list-inside space-y-1">
                                    {draft.postItems.map((pi) => (
                                        <li key={pi.id}>
                                            <a
                                                href={pi.item.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline"
                                            >
                                                {pi.item.source.name}: {pi.item.title}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'hook' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hook (Mở đầu thu hút)
                            </label>
                            <textarea
                                value={hookText}
                                onChange={(e) => setHookText(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="📚 Tin tức nóng hổi từ thế giới Blockchain & EdTech..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {hookText.length} ký tự
                            </p>
                        </div>
                    )}

                    {activeTab === 'bullets' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Bullets (6-10 điểm tin)
                            </label>
                            <textarea
                                value={bulletsText}
                                onChange={(e) => setBulletsText(e.target.value)}
                                rows={16}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                placeholder="🎯 **Nguồn**: Tóm tắt ngắn gọn nội dung...&#10;👉 Đọc thêm: https://..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {bulletsText.length} ký tự
                            </p>
                        </div>
                    )}

                    {activeTab === 'ocvn' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                OCVN Take (Góc nhìn cộng đồng)
                            </label>
                            <textarea
                                value={ocvnTakeText}
                                onChange={(e) => setOcvnTakeText(e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="💼 **OCVN Take**: Builder vibe comment..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {ocvnTakeText.length} ký tự
                            </p>
                        </div>
                    )}

                    {activeTab === 'cta' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CTA (Call to Action)
                            </label>
                            <textarea
                                value={ctaText}
                                onChange={(e) => setCtaText(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="💬 Bạn nghĩ gì về những tin tức này?..."
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {ctaText.length} ký tự
                            </p>
                        </div>
                    )}

                    {activeTab === 'hashtags' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Hashtags (cách nhau bằng dấu cách)
                            </label>
                            <textarea
                                value={hashtags}
                                onChange={(e) => setHashtags(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="#ocvn #opencampus #educampus #blockchain #edtech"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {hashtags.split(/\s+/).filter(t => t.startsWith('#')).length} hashtags
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {updateMutation.isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {draft.status === 'DRAFT' && (
                            <>
                                <button
                                    onClick={() => setShowRejectDialog(true)}
                                    disabled={rejectMutation.isPending}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                                >
                                    ❌ Từ chối
                                </button>
                                <button
                                    onClick={handleApprove}
                                    disabled={approveMutation.isPending}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {approveMutation.isPending ? 'Đang duyệt...' : '✅ Duyệt bài'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            </div>

            {/* Reject Dialog */}
            {showRejectDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Lý do từ chối</h3>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Nhập lý do từ chối bài viết này..."
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={handleReject}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                Xác nhận từ chối
                            </button>
                            <button
                                onClick={() => setShowRejectDialog(false)}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
