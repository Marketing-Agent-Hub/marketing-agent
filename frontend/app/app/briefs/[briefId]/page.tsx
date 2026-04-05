'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useBrief, useApproveDraft, useRejectDraft, useRegenerateDrafts, useEditDraft } from '@/hooks/use-content';
import { useScheduleDraft } from '@/hooks/use-publishing';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import type { ContentDraft } from '@/lib/types';

export default function BriefDetailPage({ params }: { params: Promise<{ briefId: string }> }) {
    const { briefId } = use(params);
    const id = parseInt(briefId);
    const { data: brief, isLoading } = useBrief(id);
    const regenerate = useRegenerateDrafts(id);
    const router = useRouter();
    const [selectedDraftId, setSelectedDraftId] = useState<number | null>(null);

    if (isLoading) return <div className="p-8 space-y-4"><SkeletonCard /><SkeletonCard /></div>;
    if (!brief) return <div className="p-8 text-zinc-500">Brief not found.</div>;

    const selectedDraft = brief.drafts?.find((d) => d.id === selectedDraftId) ?? brief.drafts?.[0];

    return (
        <div className="px-8 py-8 max-w-5xl">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to queue
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Brief info */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                        <h1 className="text-lg font-bold text-zinc-900 mb-2">{brief.title}</h1>
                        {brief.objective && (
                            <div className="mb-3">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Objective</p>
                                <p className="text-sm text-zinc-700">{brief.objective}</p>
                            </div>
                        )}
                        {brief.keyAngle && (
                            <div className="mb-3">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Key angle</p>
                                <p className="text-sm text-zinc-700">{brief.keyAngle}</p>
                            </div>
                        )}
                        {brief.callToAction && (
                            <div className="mb-3">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">CTA</p>
                                <p className="text-sm text-zinc-700">{brief.callToAction}</p>
                            </div>
                        )}
                        {brief.contentMode && (
                            <Badge variant="info">{brief.contentMode}</Badge>
                        )}
                    </div>

                    {/* Draft list */}
                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-zinc-900">Drafts</p>
                            <Button variant="ghost" size="sm" onClick={() => regenerate.mutate()} loading={regenerate.isPending}>
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {brief.drafts?.map((draft) => (
                                <button
                                    key={draft.id}
                                    onClick={() => setSelectedDraftId(draft.id)}
                                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${selectedDraft?.id === draft.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-700'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{draft.platform}</span>
                                        <Badge variant={statusVariant(draft.status)}>{draft.status.replace('_', ' ')}</Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Draft editor */}
                <div className="lg:col-span-2">
                    {selectedDraft ? (
                        <DraftEditor draft={selectedDraft} />
                    ) : (
                        <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">
                            Select a draft to review
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function DraftEditor({ draft }: { draft: ContentDraft }) {
    const [body, setBody] = useState(draft.body);
    const [editing, setEditing] = useState(false);
    const editDraft = useEditDraft(draft.id);
    const approveDraft = useApproveDraft(draft.id);
    const rejectDraft = useRejectDraft(draft.id);
    const scheduleDraft = useScheduleDraft(draft.id);
    const [scheduleDate, setScheduleDate] = useState('');

    const handleSave = () => {
        editDraft.mutate({ body });
        setEditing(false);
    };

    const handleSchedule = () => {
        if (!scheduleDate) return;
        scheduleDraft.mutate({ scheduledFor: new Date(scheduleDate).toISOString(), platform: draft.platform });
    };

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900">{draft.platform}</span>
                    <Badge variant={statusVariant(draft.status)}>{draft.status.replace('_', ' ')}</Badge>
                    <span className="text-xs text-zinc-400">v{draft.version}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                    {editing ? 'Cancel' : 'Edit'}
                </Button>
            </div>

            {/* Body */}
            {editing ? (
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={8}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
                />
            ) : (
                <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">{draft.body}</p>
            )}

            {draft.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {draft.hashtags.map((tag) => (
                        <span key={tag} className="text-xs text-blue-600">#{tag}</span>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                {editing ? (
                    <Button size="sm" onClick={handleSave} loading={editDraft.isPending}>Save changes</Button>
                ) : (
                    <>
                        {draft.status !== 'APPROVED' && (
                            <Button size="sm" onClick={() => approveDraft.mutate({})} loading={approveDraft.isPending}>
                                Approve
                            </Button>
                        )}
                        {draft.status !== 'REJECTED' && (
                            <Button size="sm" variant="danger" onClick={() => rejectDraft.mutate({})} loading={rejectDraft.isPending}>
                                Reject
                            </Button>
                        )}
                        {draft.status === 'APPROVED' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="datetime-local"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="text-xs rounded-lg border border-zinc-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                />
                                <Button size="sm" variant="secondary" onClick={handleSchedule} loading={scheduleDraft.isPending} disabled={!scheduleDate}>
                                    Schedule
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
