'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Zap } from 'lucide-react';
import { useStrategies, useGenerateStrategy, useActivateStrategy } from '@/hooks/use-strategy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { StrategyPlan } from '@/lib/types';

export default function StrategyPage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    const id = parseInt(brandId);
    const { data: strategies, isLoading } = useStrategies(id);
    const generate = useGenerateStrategy(id);
    const router = useRouter();

    const active = strategies?.find((s) => s.status === 'ACTIVE');
    const drafts = strategies?.filter((s) => s.status === 'DRAFT') ?? [];

    return (
        <div className="px-8 py-8 max-w-3xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Strategy</h1>
                    <p className="text-sm text-zinc-500 mt-1">Content strategy and planning</p>
                </div>
                <Button onClick={() => generate.mutate()} loading={generate.isPending} size="sm">
                    <Zap className="h-4 w-4" /> Generate strategy
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
            ) : !strategies?.length ? (
                <EmptyState
                    icon={CalendarDays}
                    title="No strategy yet"
                    description="Generate a content strategy based on your brand profile."
                    action={{ label: 'Generate strategy', onClick: () => generate.mutate() }}
                />
            ) : (
                <div className="space-y-4">
                    {active && <StrategyCard strategy={active} brandId={id} router={router} />}
                    {drafts.map((s) => <StrategyCard key={s.id} strategy={s} brandId={id} router={router} />)}
                </div>
            )}
        </div>
    );
}

function StrategyCard({ strategy, brandId, router }: { strategy: StrategyPlan; brandId: number; router: ReturnType<typeof useRouter> }) {
    const activate = useActivateStrategy(strategy.id);

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="font-semibold text-zinc-900">{strategy.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5">{strategy.objective}</p>
                </div>
                <Badge variant={strategy.status === 'ACTIVE' ? 'success' : 'muted'}>{strategy.status}</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(strategy.startDate).toLocaleDateString()} — {new Date(strategy.endDate).toLocaleDateString()}
            </div>
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => router.push(`/app/brands/${brandId}/strategy/${strategy.id}/calendar`)}
                >
                    View calendar
                </Button>
                {strategy.status === 'DRAFT' && (
                    <Button size="sm" onClick={() => activate.mutate()} loading={activate.isPending}>
                        Activate
                    </Button>
                )}
            </div>
        </div>
    );
}
