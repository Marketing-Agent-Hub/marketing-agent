'use client';
import { use } from 'react';
import { Send, AlertCircle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { usePublishJobs, useSocialAccounts, useRetryJob, useConnectSocialAccount, useDisconnectSocialAccount } from '@/hooks/use-publishing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { PublishJob, SocialAccount } from '@/lib/types';

export default function PublishingPage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    const id = parseInt(brandId);
    const { data: jobs, isLoading: loadingJobs } = usePublishJobs(id);
    const { data: accounts, isLoading: loadingAccounts } = useSocialAccounts(id);

    const failed = jobs?.filter((j) => j.status === 'FAILED') ?? [];
    const scheduled = jobs?.filter((j) => j.status === 'SCHEDULED') ?? [];
    const published = jobs?.filter((j) => j.status === 'PUBLISHED') ?? [];

    return (
        <div className="px-8 py-8 max-w-4xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Publishing</h1>
                <p className="text-sm text-zinc-500 mt-1">Social accounts and publish jobs</p>
            </div>

            {/* Social accounts */}
            <section>
                <h2 className="text-base font-semibold text-zinc-900 mb-4">Connected accounts</h2>
                {loadingAccounts ? (
                    <SkeletonCard />
                ) : !accounts?.length ? (
                    <div className="rounded-xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
                        No social accounts connected yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {accounts.map((acc) => <AccountRow key={acc.id} account={acc} />)}
                    </div>
                )}
            </section>

            {/* Failed jobs */}
            {failed.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-red-600 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" /> Failed jobs ({failed.length})
                    </h2>
                    <div className="space-y-2">
                        {failed.map((job) => <JobRow key={job.id} job={job} />)}
                    </div>
                </section>
            )}

            {/* Scheduled */}
            <section>
                <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-zinc-400" /> Scheduled ({scheduled.length})
                </h2>
                {loadingJobs ? (
                    <div className="space-y-2">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
                ) : scheduled.length === 0 ? (
                    <EmptyState icon={Send} title="No scheduled posts" description="Approve and schedule drafts from the review queue." />
                ) : (
                    <div className="space-y-2">
                        {scheduled.map((job) => <JobRow key={job.id} job={job} />)}
                    </div>
                )}
            </section>

            {/* Published */}
            {published.length > 0 && (
                <section>
                    <h2 className="text-base font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" /> Published ({published.length})
                    </h2>
                    <div className="space-y-2">
                        {published.slice(0, 10).map((job) => <JobRow key={job.id} job={job} />)}
                    </div>
                </section>
            )}
        </div>
    );
}

function AccountRow({ account }: { account: SocialAccount }) {
    const disconnect = useDisconnectSocialAccount();
    const isConnected = account.status === 'CONNECTED';
    const isExpired = account.expiresAt && new Date(account.expiresAt) < new Date();

    return (
        <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
                {isConnected && !isExpired ? (
                    <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                    <WifiOff className="h-4 w-4 text-red-400" />
                )}
                <div>
                    <p className="text-sm font-medium text-zinc-900">{account.platform}</p>
                    {account.accountName && <p className="text-xs text-zinc-500">@{account.accountName}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={isExpired ? 'danger' : isConnected ? 'success' : 'muted'}>
                    {isExpired ? 'Expired' : account.status}
                </Badge>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect.mutate(account.id)}
                    loading={disconnect.isPending}
                >
                    Disconnect
                </Button>
            </div>
        </div>
    );
}

function JobRow({ job }: { job: PublishJob }) {
    const retry = useRetryJob(job.id);

    return (
        <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500 w-20 shrink-0">{job.platform}</span>
                <div>
                    <p className="text-xs text-zinc-500">
                        {job.status === 'PUBLISHED' ? 'Published' : 'Scheduled for'}{' '}
                        {new Date(job.scheduledFor).toLocaleString()}
                    </p>
                    {job.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5">{job.errorMessage}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Badge variant={
                    job.status === 'PUBLISHED' ? 'success' :
                        job.status === 'FAILED' ? 'danger' :
                            job.status === 'SCHEDULED' ? 'info' : 'muted'
                }>
                    {job.status}
                </Badge>
                {job.status === 'FAILED' && (
                    <Button variant="secondary" size="sm" onClick={() => retry.mutate()} loading={retry.isPending}>
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                    </Button>
                )}
            </div>
        </div>
    );
}
