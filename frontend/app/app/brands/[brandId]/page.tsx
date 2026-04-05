'use client';
import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBrand } from '@/hooks/use-brands';
import { useWorkspaceStore } from '@/store/workspace';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge, statusVariant } from '@/components/ui/badge';

export default function BrandPage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    const id = parseInt(brandId);
    const { data: brand, isLoading } = useBrand(id);
    const { setActiveBrand } = useWorkspaceStore();
    const router = useRouter();

    useEffect(() => {
        if (brand) setActiveBrand(brand);
    }, [brand, setActiveBrand]);

    if (isLoading) return <div className="p-8 space-y-4"><SkeletonCard /><SkeletonCard /></div>;
    if (!brand) return <div className="p-8 text-zinc-500">Brand not found.</div>;

    return (
        <div className="px-8 py-8 max-w-3xl">
            <div className="flex items-start justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold text-zinc-900">{brand.name}</h1>
                        <Badge variant={brand.status === 'ACTIVE' ? 'success' : 'muted'}>{brand.status}</Badge>
                    </div>
                    {brand.industry && <p className="text-sm text-zinc-500">{brand.industry}</p>}
                    {brand.websiteUrl && (
                        <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                            {brand.websiteUrl}
                        </a>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <NavCard
                    title="Review Queue"
                    description="Review and approve AI-generated drafts"
                    onClick={() => router.push(`/app/brands/${id}/review`)}
                />
                <NavCard
                    title="Strategy"
                    description="View and manage content strategy"
                    onClick={() => router.push(`/app/brands/${id}/strategy`)}
                />
                <NavCard
                    title="Publishing"
                    description="Manage social accounts and publish jobs"
                    onClick={() => router.push(`/app/brands/${id}/publishing`)}
                />
                <NavCard
                    title="Onboarding"
                    description="Set up brand profile and knowledge"
                    onClick={() => router.push(`/app/brands/${id}/onboarding`)}
                />
            </div>
        </div>
    );
}

function NavCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all"
        >
            <p className="font-semibold text-zinc-900 mb-1">{title}</p>
            <p className="text-xs text-zinc-500">{description}</p>
        </button>
    );
}
