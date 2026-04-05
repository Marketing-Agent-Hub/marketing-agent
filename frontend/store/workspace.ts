'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Workspace, Brand } from '@/lib/types';

interface WorkspaceState {
    activeWorkspace: Workspace | null;
    activeBrand: Brand | null;
    setActiveWorkspace: (ws: Workspace) => void;
    setActiveBrand: (brand: Brand | null) => void;
    clear: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            activeWorkspace: null,
            activeBrand: null,
            setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),
            setActiveBrand: (brand) => set({ activeBrand: brand }),
            clear: () => set({ activeWorkspace: null, activeBrand: null }),
        }),
        { name: 'workspace-storage' }
    )
);
