'use client';
import { useWorkspaceStore } from '@/store/workspace';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PublishingRedirect() {
    const { activeBrand } = useWorkspaceStore();
    const router = useRouter();

    useEffect(() => {
        if (activeBrand) {
            router.replace(`/app/brands/${activeBrand.id}/publishing`);
        } else {
            router.replace('/app/brands');
        }
    }, [activeBrand, router]);

    return null;
}
