import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import type { PublishJob, SocialPlatform } from '@/types';

const statusIcon: Record<string, string> = {
    PUBLISHED: '✅',
    SCHEDULED: '⏰',
    FAILED: '⚠️',
};

const platformLabel: Record<SocialPlatform, string> = {
    FACEBOOK: 'Facebook',
    LINKEDIN: 'LinkedIn',
    X: 'X',
    TIKTOK: 'TikTok',
    INSTAGRAM: 'Instagram',
};

export default function PublishingDashboardPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const bid = Number(brandId);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const qc = useQueryClient();

    const { data: jobs, isLoading } = useQuery<PublishJob[]>({
        queryKey: ['publish-jobs', bid, page],
        queryFn: () => apiClient.get(`/api/brands/${bid}/publish-jobs?page=${page}`).then((r) => r.data.jobs ?? r.data),
        enabled: !!bid,
    });

    const retryMutation = useMutation({
        mutationFn: (jobId: string) => apiClient.post(`/api/publish-jobs/${jobId}/retry`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['publish-jobs', bid] });
            toast.success('Retry requested!');
        },
    });

    if (isLoading) {
        return <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} variant="card" className="h-16" />)}</div>;
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">Publishing</h1>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Track publishing status</p>
            </div>

            <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] bg-white/5">
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Scheduled At</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Channel</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-muted)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs?.map((job) => (
                            <>
                                <tr key={job.id}
                                    onClick={() => job.status === 'FAILED' && setExpandedId(expandedId === job.id ? null : job.id)}
                                    className={`border-b border-[var(--color-border)] transition-colors ${job.status === 'FAILED' ? 'bg-red-500/5 cursor-pointer hover:bg-red-500/10' : 'hover:bg-white/5'
                                        }`}>
                                    <td className="px-4 py-3 text-[var(--color-text)]">
                                        {new Date(job.scheduledFor).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-4 py-3 text-[var(--color-text-muted)]">{platformLabel[job.channel]}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 text-xs ${job.status === 'PUBLISHED' ? 'text-green-400' :
                                            job.status === 'SCHEDULED' ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                            {statusIcon[job.status]} {job.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {job.status === 'FAILED' && (
                                            <Button variant="ghost" className="text-xs px-2 py-1"
                                                loading={retryMutation.isPending}
                                                onClick={(e) => { e.stopPropagation(); retryMutation.mutate(job.id); }}>
                                                Retry
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === job.id && job.errorMessage && (
                                    <tr key={`${job.id}-error`} className="bg-red-500/5">
                                        <td colSpan={4} className="px-4 py-3">
                                            <p className="text-xs text-red-400">⚠️ {job.errorMessage}</p>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" className="text-xs px-3 py-1" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</Button>
                <span className="flex items-center text-xs text-[var(--color-text-muted)]">Page {page}</span>
                <Button variant="ghost" className="text-xs px-3 py-1" onClick={() => setPage(p => p + 1)} disabled={!jobs?.length}>Next →</Button>
            </div>
        </div>
    );
}
