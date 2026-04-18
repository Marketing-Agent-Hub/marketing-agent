import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import type { PendingSource } from '@/types';

export default function SourceDiscoveryPage() {
    const [currentIdx, setCurrentIdx] = useState(0);
    const qc = useQueryClient();

    const { data: sources, isLoading } = useQuery<PendingSource[]>({
        queryKey: ['pending-sources'],
        queryFn: () => apiClient.get('/api/internal/source-discovery/pending').then((r) => r.data.data ?? r.data),
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/api/internal/source-discovery/pending/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pending-sources'] });
            toast.success('Nguồn đã được duyệt!');
            setCurrentIdx(0);
        },
    });

    const rejectMutation = useMutation({
        mutationFn: (id: number) => apiClient.post(`/api/internal/source-discovery/pending/${id}/reject`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['pending-sources'] });
            toast.info('Nguồn đã bị từ chối.');
            setCurrentIdx(0);
        },
    });

    const current = sources?.[currentIdx];
    const remaining = sources?.length ?? 0;

    // Keyboard shortcuts Y/N
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (!current) return;
            if (e.key === 'y' || e.key === 'Y') approveMutation.mutate(current.id);
            if (e.key === 'n' || e.key === 'N') rejectMutation.mutate(current.id);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [current, approveMutation, rejectMutation]);

    if (isLoading) {
        return <div className="space-y-3"><Skeleton variant="card" /><Skeleton variant="text" /></div>;
    }

    if (!sources?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center font-mono">
                <div className="mb-4 text-4xl">✅</div>
                <p className="text-sm text-white/60">Không còn nguồn nào chờ duyệt.</p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-xl font-mono">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-sm font-bold text-white">Source Discovery</h1>
                <span className="text-xs text-white/40">Còn {remaining} nguồn chưa duyệt</span>
            </div>

            {current && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <div>
                        <h2 className="text-base font-bold text-white">{current.name}</h2>
                        <a href={current.url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#4FACFE] hover:underline truncate block">{current.url}</a>
                    </div>

                    <div>
                        <p className="mb-2 text-[10px] uppercase tracking-wider text-white/30">Sample Headlines</p>
                        <ul className="space-y-1">
                            {current.sampleHeadlines.map((h, i) => (
                                <li key={i} className="text-xs text-white/70">• {h}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-white/30">Relevance Score</p>
                            <p className="font-bold text-[#4FACFE]">{current.relevanceScore}/100</p>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="destructive" onClick={() => rejectMutation.mutate(current.id)}
                                loading={rejectMutation.isPending} className="text-xs">
                                ✗ Reject (N)
                            </Button>
                            <Button onClick={() => approveMutation.mutate(current.id)}
                                loading={approveMutation.isPending} className="text-xs">
                                ✓ Approve (Y)
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <p className="mt-4 text-center text-[10px] text-white/20">
                <kbd className="rounded border border-white/10 px-1">Y</kbd> Approve ·{' '}
                <kbd className="rounded border border-white/10 px-1">N</kbd> Reject
            </p>
        </div>
    );
}
