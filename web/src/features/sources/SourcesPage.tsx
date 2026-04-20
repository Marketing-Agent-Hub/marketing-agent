import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Slider from '@/components/ui/Slider';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import type { BrandSource, FilterProfile } from '@/types';

export default function SourcesPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const bid = Number(brandId);
    const qc = useQueryClient();
    const [showFilterConfirm, setShowFilterConfirm] = useState(false);
    const [threshold, setThreshold] = useState(0.6);
    const [topicTags, setTopicTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    const { data: sources, isLoading } = useQuery<BrandSource[]>({
        queryKey: ['sources', bid],
        queryFn: () => apiClient.get(`/api/brands/${bid}/sources`).then((r) => r.data.data ?? r.data),
        enabled: !!bid,
    });

    const { data: filterProfile } = useQuery<FilterProfile>({
        queryKey: ['filter-profile', bid],
        queryFn: () => apiClient.get(`/api/brands/${bid}/filter-profile`).then((r) => r.data),
        enabled: !!bid,
    });

    // Sync filter profile data into local state when it loads
    useEffect(() => {
        if (filterProfile) {
            setThreshold(filterProfile.similarityThreshold);
            setTopicTags(filterProfile.topicTags);
        }
    }, [filterProfile]);

    const updateFilterMutation = useMutation({
        mutationFn: (data: FilterProfile) => apiClient.patch(`/api/brands/${bid}/filter-profile`, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['filter-profile', bid] });
            toast.success('Filter Profile has been updated!');
            setShowFilterConfirm(false);
        },
    });

    const addTag = () => {
        if (tagInput.trim() && !topicTags.includes(tagInput.trim())) {
            setTopicTags(prev => [...prev, tagInput.trim()]);
            setTagInput('');
        }
    };

    return (
        <div className="max-w-3xl space-y-8">
            <div>
                <h1 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">Sources</h1>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage RSS sources and content filters</p>
            </div>

            {/* Sources list */}
            <div>
                <h2 className="mb-3 text-sm font-medium text-[var(--color-text)]">Followed sources</h2>
                {isLoading ? (
                    <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} variant="card" className="h-16" />)}</div>
                ) : (
                    <div className="space-y-2">
                        {sources?.map((src) => (
                            <div key={src.id} className="glass flex items-center gap-4 rounded-xl p-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">📡</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[var(--color-text)] truncate">{src.name}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] truncate">{src.rssUrl}</p>
                                </div>
                                <span className={`text-xs ${src.lastFetchSuccess ? 'text-green-400' : 'text-red-400'}`}>
                                    {src.lastFetchSuccess ? '🟢' : '🔴'} {src.lastFetchedAt ? new Date(src.lastFetchedAt).toLocaleDateString('vi-VN') : 'Not fetched'}
                                </span>
                            </div>
                        ))}
                        {!sources?.length && (
                            <p className="text-sm text-[var(--color-text-muted)]">No sources available.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Filter Profile */}
            <div className="glass rounded-xl p-6 space-y-4">
                <h2 className="text-sm font-medium text-[var(--color-text)]">Filter Profile</h2>

                <div>
                    <label className="mb-2 block text-xs text-[var(--color-text-muted)]">
                        Similarity Threshold ? filter content by relevance
                    </label>
                    <Slider value={threshold} onChange={setThreshold} />
                </div>

                <div>
                    <label className="mb-2 block text-xs text-[var(--color-text-muted)]">Topic Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {topicTags.map((tag) => (
                            <span key={tag} className="flex items-center gap-1 rounded-full bg-[#4FACFE]/10 px-3 py-1 text-xs text-[#4FACFE]">
                                {tag}
                                <button onClick={() => setTopicTags(prev => prev.filter(t => t !== tag))} className="hover:text-red-400">×</button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTag()}
                            placeholder="Add tag (Enter)"
                            className="flex-1 rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-xs text-[var(--color-text)] outline-none" />
                        <Button variant="ghost" onClick={addTag} className="text-xs px-3 py-1">Add</Button>
                    </div>
                </div>

                <Button onClick={() => setShowFilterConfirm(true)} variant="ghost">Save Filter Profile</Button>
            </div>

            <Modal open={showFilterConfirm} onClose={() => setShowFilterConfirm(false)}
                title="Confirm Filter Profile changes" variant="destructive"
                confirmLabel="Save changes"
                onConfirm={() => updateFilterMutation.mutate({ mode: 'SIMILARITY', similarityThreshold: threshold, topicTags })}
                confirmLoading={updateFilterMutation.isPending}>
                <p>This change will affect the entire brand content filtering pipeline. Are you sure?</p>
            </Modal>
        </div>
    );
}
