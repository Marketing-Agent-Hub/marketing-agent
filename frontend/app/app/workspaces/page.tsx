'use client';
import { useRouter } from 'next/navigation';
import { Building2, Plus } from 'lucide-react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { useWorkspaceStore } from '@/store/workspace';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { Workspace } from '@/lib/types';

export default function WorkspacesPage() {
    const { data: workspaces, isLoading } = useWorkspaces();
    const { setActiveWorkspace } = useWorkspaceStore();
    const router = useRouter();

    const select = (ws: Workspace) => {
        setActiveWorkspace(ws);
        router.push(`/app/workspaces/${ws.id}`);
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Your workspaces</h1>
                    <p className="text-sm text-zinc-500 mt-1">Select a workspace to continue</p>
                </div>
                <Button onClick={() => router.push('/app/workspaces/new')} size="sm">
                    <Plus className="h-4 w-4" /> New workspace
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <SkeletonCard key={i} />)}
                </div>
            ) : !workspaces?.length ? (
                <EmptyState
                    icon={Building2}
                    title="No workspaces yet"
                    description="Create your first workspace to get started."
                    action={{ label: 'Create workspace', onClick: () => router.push('/app/workspaces/new') }}
                />
            ) : (
                <div className="space-y-3">
                    {workspaces.map((ws) => (
                        <button
                            key={ws.id}
                            onClick={() => select(ws)}
                            className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-zinc-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {ws.name[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-semibold text-zinc-900">{ws.name}</p>
                                    <p className="text-xs text-zinc-500">/{ws.slug}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
