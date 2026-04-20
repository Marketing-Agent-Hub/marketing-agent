import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useStrategy, useGenerateStrategy, useActivateStrategy } from '@/hooks/useStrategy';
import { usePolling } from '@/hooks/usePolling';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import apiClient from '@/api/client';
import type { Brand, StrategyPlan, StrategySlot, SocialPlatform } from '@/types';

const PLATFORMS: SocialPlatform[] = ['FACEBOOK', 'LINKEDIN', 'X', 'TIKTOK', 'INSTAGRAM'];

export default function StrategyCalendarPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const navigate = useNavigate();
    const bid = Number(brandId);

    const [showModal, setShowModal] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [durationDays, setDurationDays] = useState(30);
    const [postsPerWeek, setPostsPerWeek] = useState(5);
    const [selectedChannels, setSelectedChannels] = useState<SocialPlatform[]>(['FACEBOOK', 'LINKEDIN']);

    const { data: brand } = useQuery<Brand>({
        queryKey: ['brand', bid],
        queryFn: () => apiClient.get(`/api/brands/${bid}`).then((r) => r.data),
        enabled: !!bid,
    });

    const { data: strategies, isLoading } = useStrategy(bid);
    const generateMutation = useGenerateStrategy(bid);
    const activateMutation = useActivateStrategy();

    const activeStrategy = strategies?.find((s) => s.status === 'ACTIVE') ?? strategies?.[0];

    // Poll while generating
    usePolling<StrategyPlan[]>({
        queryKey: ['strategy', bid],
        queryFn: () => apiClient.get(`/api/brands/${bid}/strategies`).then((r) => r.data.strategies ?? r.data),
        shouldStop: (data) => data.some((s) => s.status === 'ACTIVE' || (s.slots?.length ?? 0) > 0),
        enabled: generating,
        intervalMs: 3000,
        timeoutMs: 120_000,
        onStop: () => {
            setGenerating(false);
            toast.success('Content plan created!');
        },
        onTimeout: () => {
            setGenerating(false);
            toast.error('Plan generation timed out. Please try again.');
        },
    });

    const handleGenerate = async () => {
        try {
            await generateMutation.mutateAsync({ durationDays, postsPerWeek, channels: selectedChannels });
            setShowModal(false);
            setGenerating(true);
            toast.info('AI is generating content plan. You can do other work.');
        } catch {
            // handled by interceptor
        }
    };

    const handleActivate = async (strategyId: number) => {
        await activateMutation.mutateAsync({ strategyId, brandId: bid });
        toast.success('Strategy activated!');
    };

    const toggleChannel = (ch: SocialPlatform) => {
        setSelectedChannels((prev) =>
            prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
        );
    };

    // Build 30-day grid from slots
    const buildGrid = (strategy: StrategyPlan | undefined) => {
        const days: Array<{ date: string; slots: StrategySlot[] }> = [];
        const start = strategy?.startDate ? new Date(strategy.startDate) : new Date();
        for (let i = 0; i < 30; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const slots = strategy?.slots?.filter((s) => s.scheduledFor.startsWith(dateStr)) ?? [];
            days.push({ date: dateStr, slots });
        }
        return days;
    };

    const grid = buildGrid(activeStrategy);

    if (!brand?.profile && !isLoading) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
                <div className="mb-4 text-5xl">🎯</div>
                <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-medium text-[var(--color-text)]">
                    No Brand Profile
                </h3>
                <p className="mb-6 text-sm text-[var(--color-text-muted)]">
                    Complete Onboarding so AI can understand your brand before generating strategy.
                </p>
                <Button onClick={() => navigate(`/b/${bid}/onboarding`)}>Start Onboarding</Button>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">
                        Strategy Calendar
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">30-day content plan</p>
                </div>
                <div className="flex gap-3">
                    {activeStrategy && activeStrategy.status !== 'ACTIVE' && (
                        <Button
                            variant="ghost"
                            onClick={() => handleActivate(activeStrategy.id)}
                            loading={activateMutation.isPending}
                        >
                            ⚡ Activate
                        </Button>
                    )}
                    <Button onClick={() => setShowModal(true)}>+ Create Plan</Button>
                </div>
            </div>

            {/* 30-day grid */}
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-7 lg:grid-cols-10">
                {grid.map((day, i) => (
                    <div
                        key={day.date}
                        className="glass min-h-[80px] rounded-lg p-2 transition-all hover:border-[#4FACFE]/20"
                    >
                        <p className="mb-1 text-[10px] text-[var(--color-text-muted)]">
                            {new Date(day.date).getDate()}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {generating ? (
                                // Waterfall skeleton animation — staggered per day
                                i % 3 !== 0 ? (
                                    <div
                                        className="animate-pulse"
                                        style={{
                                            animationDelay: `${i * 50}ms`,
                                            animationDuration: '1.5s',
                                        }}
                                    >
                                        <Skeleton variant="chip" className="w-12" />
                                    </div>
                                ) : null
                            ) : (
                                day.slots.map((slot) => (
                                    <Badge key={slot.id} platform={slot.channel} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Generate modal */}
            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Create 30-Day Plan"
                confirmLabel="Create plan"
                onConfirm={handleGenerate}
                confirmLoading={generateMutation.isPending}
            >
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Number of days</label>
                        <input
                            type="number"
                            value={durationDays}
                            onChange={(e) => setDurationDays(Number(e.target.value))}
                            min={7}
                            max={90}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-[var(--color-text-muted)]">Posts/week</label>
                        <input
                            type="number"
                            value={postsPerWeek}
                            onChange={(e) => setPostsPerWeek(Number(e.target.value))}
                            min={1}
                            max={21}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] outline-none"
                        />
                    </div>
                    <div>
                        <label className="mb-2 block text-xs text-[var(--color-text-muted)]">Publishing channel</label>
                        <div className="flex flex-wrap gap-2">
                            {PLATFORMS.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => toggleChannel(p)}
                                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${selectedChannels.includes(p)
                                        ? 'border-[#4FACFE] bg-[#4FACFE]/10 text-[#4FACFE]'
                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-white/5'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
