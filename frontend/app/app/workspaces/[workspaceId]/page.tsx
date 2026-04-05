'use client';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Send, AlertTriangle, Layers } from 'lucide-react';
import { useWorkspace } from '@/hooks/use-workspaces';
import { useBrands } from '@/hooks/use-brands';
import { useWorkspaceStore } from '@/store/workspace';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function WorkspaceDashboard({ params }: { params: Promise<{ workspaceId: string }> }) {
    const { workspaceId } = use(params);
    const id = parseInt(workspaceId);
    const { data: workspace } = useWorkspace(id);
    const { data: brands } = useBrands(id);
    const { setActiveWorkspace, setActiveBrand } = useWorkspaceStore();
    const router = useRouter();

    useEffect(() => {
        if (workspace) setActiveWorkspace(workspace);
    }, [workspace, setActiveWorkspace]);

    const activeBrand = brands?.find((b) => b.status === 'ACTIVE') ?? brands?.[0];

    return (
        <div className="px-8 py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-zinc-900">{workspace?.name ?? 'Dashboard'}</h1>
                <p className="text-sm text-zinc-500 mt-1">Overview of your workspace</p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard icon={Layers} label="Brands" value={brands?.length ?? 0} />
                <StatCard icon={Inbox} label="Pending review" value="—" />
                <StatCard icon={Send} label="Scheduled posts" value="—" />
            </div>

            {/* Brands list */}
            <div className="mb-6 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900">Brands</h2>
                <Button size="sm" onClick={() => router.push('/app/brands/new')}>
                    Add brand
                </Button>
            </div>

            {!brands ? (
                <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
            ) : brands.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center">
                    <p className="text-sm text-zinc-500">No brands yet.</p>
                    <Button className="mt-3" size="sm" onClick={() => router.push('/app/brands/new')}>
                        Create your first brand
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {brands.map((brand) => (
                        <button
                            key={brand.id}
                            onClick={() => {
                                setActiveBrand(brand);
                                router.push(`/app/brands/${brand.id}`);
                            }}
                            className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-zinc-900">{brand.name}</p>
                                    {brand.industry && <p className="text-xs text-zinc-500">{brand.industry}</p>}
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${brand.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                        brand.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-zinc-100 text-zinc-500'
                                    }`}>
                                    {brand.status}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-zinc-400" />
                <span className="text-xs text-zinc-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-zinc-900">{value}</p>
        </div>
    );
}
