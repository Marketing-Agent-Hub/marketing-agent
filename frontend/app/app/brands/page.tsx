'use client';
import { useRouter } from 'next/navigation';
import { Layers, Plus } from 'lucide-react';
import { useBrands } from '@/hooks/use-brands';
import { useWorkspaceStore } from '@/store/workspace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function BrandsPage() {
    const { activeWorkspace, setActiveBrand } = useWorkspaceStore();
    const { data: brands, isLoading } = useBrands(activeWorkspace?.id);
    const router = useRouter();

    return (
        <div className="px-8 py-8 max-w-3xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Brands</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage your brands</p>
                </div>
                <Button size="sm" onClick={() => router.push('/app/brands/new')}>
                    <Plus className="h-4 w-4" /> New brand
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
            ) : !brands?.length ? (
                <EmptyState
                    icon={Layers}
                    title="No brands yet"
                    description="Create your first brand to start generating content."
                    action={{ label: 'Create brand', onClick: () => router.push('/app/brands/new') }}
                />
            ) : (
                <div className="space-y-3">
                    {brands.map((brand) => (
                        <button
                            key={brand.id}
                            onClick={() => { setActiveBrand(brand); router.push(`/app/brands/${brand.id}`); }}
                            className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-zinc-900">{brand.name}</p>
                                    {brand.industry && <p className="text-xs text-zinc-500 mt-0.5">{brand.industry}</p>}
                                </div>
                                <Badge variant={brand.status === 'ACTIVE' ? 'success' : 'muted'}>{brand.status}</Badge>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
