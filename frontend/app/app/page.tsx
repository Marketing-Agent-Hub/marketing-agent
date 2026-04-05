'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/store/workspace';

export default function AppRoot() {
    const { activeWorkspace } = useWorkspaceStore();
    const router = useRouter();

    useEffect(() => {
        if (activeWorkspace) {
            router.replace(`/app/workspaces/${activeWorkspace.id}`);
        } else {
            router.replace('/app/workspaces');
        }
    }, [activeWorkspace, router]);

    return null;
}
