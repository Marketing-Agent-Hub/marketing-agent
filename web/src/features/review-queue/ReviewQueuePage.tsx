import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useReviewQueue, useApproveDraft, useRejectDraft, useUpdateDraft } from '@/hooks/useReviewQueue';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import type { ContentDraft } from '@/types';

export default function ReviewQueuePage() {
    const { brandId } = useParams<{ brandId: string }>();
    const bid = Number(brandId);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [editedContent, setEditedContent] = useState('');
    const [isEdited, setIsEdited] = useState(false);
    const [showRejectPopover, setShowRejectPopover] = useState(false);
    const [rejectComment, setRejectComment] = useState('');
    const [showConfetti, setShowConfetti] = useState(false);
    const rejectTextareaRef = useRef<HTMLTextAreaElement>(null);

    const { data: drafts, isLoading } = useReviewQueue(bid);
    const approveMutation = useApproveDraft(bid);
    const rejectMutation = useRejectDraft(bid);
    const updateMutation = useUpdateDraft(bid);

    const currentDraft: ContentDraft | undefined = drafts?.[currentIdx];

    // Sync content when draft changes
    useEffect(() => {
        if (currentDraft) {
            setEditedContent(currentDraft.content);
            setIsEdited(false);
        }
    }, [currentDraft?.id]);

    // Focus reject textarea when popover opens
    useEffect(() => {
        if (showRejectPopover) {
            setTimeout(() => rejectTextareaRef.current?.focus(), 50);
        }
    }, [showRejectPopover]);

    const triggerConfetti = () => {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 1000);
    };

    const handleApprove = useCallback(async () => {
        if (!currentDraft || approveMutation.isPending) return;
        if (isEdited) {
            await updateMutation.mutateAsync({ draftId: currentDraft.id, content: editedContent });
        }
        await approveMutation.mutateAsync(currentDraft.id);
        triggerConfetti();
        toast.success('Post approved! ✓');
        setCurrentIdx(0);
    }, [currentDraft, approveMutation, isEdited, editedContent, updateMutation]);

    const handleReject = useCallback(async () => {
        if (!currentDraft || rejectMutation.isPending) return;
        await rejectMutation.mutateAsync({ draftId: currentDraft.id, comment: rejectComment });
        setShowRejectPopover(false);
        setRejectComment('');
        toast.info('Post rejected.');
        setCurrentIdx(0);
    }, [currentDraft, rejectMutation, rejectComment]);

    const handleContentChange = (content: string) => {
        setEditedContent(content);
        setIsEdited(content !== currentDraft?.content);
        if (currentDraft) {
            updateMutation.mutate({ draftId: currentDraft.id, content });
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleApprove();
            } else if (e.key === 'Escape' && !showRejectPopover) {
                setShowRejectPopover(true);
            } else if (e.key === 'Escape' && showRejectPopover) {
                setShowRejectPopover(false);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [handleApprove, showRejectPopover]);

    if (isLoading) {
        return (
            <div className="flex h-full gap-4">
                <div className="flex-1 space-y-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                </div>
                <div className="flex-1 space-y-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="text" />
                </div>
            </div>
        );
    }

    if (!drafts?.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-4 text-5xl">✅</div>
                <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-medium text-[var(--color-text)]">
                    No posts pending review
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">All posts processed. Check back later!</p>
            </div>
        );
    }

    const brief = currentDraft?.brief;

    return (
        <div className="relative flex h-full gap-0 overflow-hidden -m-6">
            {/* Confetti overlay */}
            {showConfetti && (
                <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
                    <div className="text-6xl animate-bounce">🎉</div>
                </div>
            )}

            {/* LEFT PANEL */}
            <div className="flex w-[45%] flex-col overflow-hidden border-r border-[var(--color-border)]">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Queue counter */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--color-text-muted)]">
                            {currentIdx + 1} / {drafts.length} posts pending review
                        </span>
                        <div className="flex gap-1">
                            {drafts.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIdx(i)}
                                    className={`h-1.5 w-4 rounded-full transition-colors ${i === currentIdx ? 'bg-[#4FACFE]' : 'bg-white/20'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* ContentBrief */}
                    {brief && (
                        <div className="glass rounded-xl p-4 space-y-2">
                            <h3 className="font-['Outfit',sans-serif] font-semibold text-[var(--color-text)]">
                                {brief.title}
                            </h3>
                            <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
                                <p><span className="text-[#4FACFE]">Objective:</span> {brief.objective}</p>
                                <p><span className="text-[#4FACFE]">Angle:</span> {brief.keyAngle}</p>
                                <p><span className="text-[#4FACFE]">CTA:</span> {brief.callToAction}</p>
                            </div>
                        </div>
                    )}

                    {/* Source article */}
                    {brief?.sourceArticle && (
                        <div className="rounded-xl border border-[var(--color-border)] p-4">
                            <p className="mb-2 text-xs font-medium text-[var(--color-text-muted)]">📰 Original Post</p>
                            <p className="text-xs leading-relaxed text-[var(--color-text)]">
                                {brief.sourceArticle.extractedContent}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)]">Draft Content</span>
                            {isEdited && (
                                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-400">
                                    ✏️ Edited by human
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(editedContent)}
                                className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <textarea
                        value={editedContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white/5 p-4 text-base leading-relaxed text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors"
                        style={{ minHeight: '60vh', lineHeight: '1.6' }}
                    />
                </div>

                {/* Sticky footer */}
                <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-[var(--color-text-muted)]">
                            <kbd className="rounded border border-[var(--color-border)] px-1">Ctrl+Enter</kbd> Approve ·{' '}
                            <kbd className="rounded border border-[var(--color-border)] px-1">Esc</kbd> Reject
                        </p>
                        <div className="flex gap-3">
                            {/* Reject popover */}
                            <div className="relative">
                                <Button
                                    variant="destructive"
                                    onClick={() => setShowRejectPopover(!showRejectPopover)}
                                    loading={rejectMutation.isPending}
                                >
                                    Reject
                                </Button>
                                {showRejectPopover && (
                                    <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-2xl">
                                        <p className="mb-2 text-xs font-medium text-[var(--color-text)]">Reason for rejection</p>
                                        <textarea
                                            ref={rejectTextareaRef}
                                            value={rejectComment}
                                            onChange={(e) => setRejectComment(e.target.value)}
                                            placeholder="Enter reason..."
                                            rows={3}
                                            className="w-full resize-none rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-xs text-[var(--color-text)] outline-none"
                                        />
                                        <div className="mt-2 flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => setShowRejectPopover(false)}
                                                className="text-xs px-3 py-1"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={handleReject}
                                                loading={rejectMutation.isPending}
                                                className="text-xs px-3 py-1"
                                            >
                                                Xác nhận
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <Button onClick={handleApprove} loading={approveMutation.isPending}>
                                ✓ Approve
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
