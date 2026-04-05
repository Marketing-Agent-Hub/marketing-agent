'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, RefreshCw } from 'lucide-react';
import { useReviewQueue, useGenerateDailyContent } from '@/hooks/use-content';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { ReviewQueueItem } from '@/lib/types';

const PLATFORM_COLORS: Record<string, string> = {
    LINKEDIN: 'bg-blue-100 text-blue-700',
    X: 'bg-zinc-100 text-zinc-700',
    FACEBOOK: 'bg-indigo-100 text-indigo-700',
    INSTAGRAM: 'bg-pink-100 text-pink-700',
    TIKTOK: 'bg-red-100 text-red-700',
};

export default function ReviewQueuePage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    const id = parseInt(brandId);
    const { data: queue, isLoading } = useReviewQueue(id);
    const generate = useGenerateDailyContent(id);
    const router = useRouter();
    const [filter, setFilter] = useState<string>('ALL');

    const filtered = (queue ?? []).filter((item) => {
        if (filter === 'ALL') return true;
        return item.drafts.some((d) => d.status === filter);
    });

    return (
        <div className="px-8 py-8 max-w-4xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Review Queue</h1>
                    <p className="text-sm text-zinc-500 mt-1">{queue?.length ?? 0} items pending</p>
                </div>
                <Button onClick={() => generate.mutate()} loading={generate.isPending} size="sm" variant="secondary">
                    <RefreshCw className="h-4 w-4" /> Generate content
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6">
                {['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                    >
                        {s === 'ALL' ? 'All' : s.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Inbox}
                    title="Queue is empty"
                    description="Generate daily content to populate the review queue."
                    action={{ label: 'Generate content', onClick: () => generate.mutate() }}
                />
            ) : (
                <div className="space-y-3">
                    {filtered.map((item) => (
                        <QueueItem key={item.brief.id} item={item} onClick={() => router.push(`/app/briefs/${item.brief.id}`)} />
                    ))}
                </div>
            )}
        </div>
    );
}

function QueueItem({ item, onClick }: { item: ReviewQueueItem; onClick: () => void }) {
    const { brief, drafts } = item;
    const primaryDraft = drafts[0];

    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{brief.title}</p>
                    {brief.objective && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{brief.objective}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                        {brief.contentMode && (
                            <span className="text-xs text-zinc-400">{brief.contentMode}</span>
                        )}
                        {primaryDraft && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[primaryDraft.platform] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                {primaryDraft.platform}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                    {primaryDraft && (
                        <Badge variant={statusVariant(primaryDraft.status)}>{primaryDraft.status.replace('_', ' ')}</Badge>
                    )}
                    <span className="text-xs text-zinc-400">{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
                </div>
            </div>
        </button>
    );
}
