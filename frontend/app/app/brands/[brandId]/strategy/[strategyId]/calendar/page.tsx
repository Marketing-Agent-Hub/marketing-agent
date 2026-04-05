'use client';
import { use } from 'react';
import { useStrategy, useStrategySlots } from '@/hooks/use-strategy';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import type { StrategySlot } from '@/lib/types';

const PLATFORM_COLORS: Record<string, string> = {
    LINKEDIN: 'bg-blue-100 text-blue-700',
    X: 'bg-zinc-100 text-zinc-700',
    FACEBOOK: 'bg-indigo-100 text-indigo-700',
    INSTAGRAM: 'bg-pink-100 text-pink-700',
    TIKTOK: 'bg-red-100 text-red-700',
};

export default function CalendarPage({ params }: { params: Promise<{ brandId: string; strategyId: string }> }) {
    const { brandId, strategyId } = use(params);
    const sid = parseInt(strategyId);
    const { data: strategy, isLoading: loadingStrategy } = useStrategy(sid);
    const { data: slots, isLoading: loadingSlots } = useStrategySlots(sid);

    if (loadingStrategy || loadingSlots) {
        return <div className="p-8 space-y-3">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>;
    }

    // Group slots by week
    const grouped = (slots ?? []).reduce<Record<string, StrategySlot[]>>((acc, slot) => {
        const week = getWeekLabel(slot.scheduledFor);
        if (!acc[week]) acc[week] = [];
        acc[week].push(slot);
        return acc;
    }, {});

    return (
        <div className="px-8 py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-900">{strategy?.title}</h1>
                <p className="text-sm text-zinc-500 mt-1">{strategy?.objective}</p>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <p className="text-sm text-zinc-400">No slots planned yet.</p>
            ) : (
                <div className="space-y-8">
                    {Object.entries(grouped).map(([week, weekSlots]) => (
                        <div key={week}>
                            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">{week}</h2>
                            <div className="space-y-2">
                                {weekSlots.map((slot) => (
                                    <div key={slot.id} className="flex items-center gap-4 rounded-lg border border-zinc-100 bg-white px-4 py-3">
                                        <div className="w-24 text-xs text-zinc-500 shrink-0">
                                            {new Date(slot.scheduledFor).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PLATFORM_COLORS[slot.channel] ?? 'bg-zinc-100 text-zinc-600'}`}>
                                            {slot.channel}
                                        </span>
                                        {slot.funnelStage && (
                                            <span className="text-xs text-zinc-400">{slot.funnelStage}</span>
                                        )}
                                        <div className="ml-auto">
                                            <Badge variant={
                                                slot.status === 'APPROVED' ? 'success' :
                                                    slot.status === 'DRAFT_READY' ? 'info' :
                                                        slot.status === 'BRIEF_READY' ? 'warning' :
                                                            'muted'
                                            }>
                                                {slot.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function getWeekLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    return `Week of ${start.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
}
