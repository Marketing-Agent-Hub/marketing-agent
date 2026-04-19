import { create } from 'zustand';

interface UiState {
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    activeWorkspaceId: number;
    setActiveWorkspaceId: (id: number) => void;
}

const STORAGE_KEY = 'app_active_workspace';

export const useUiStore = create<UiState>((set) => ({
    sidebarCollapsed: false,
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    activeWorkspaceId: Number(localStorage.getItem(STORAGE_KEY)) || 0,
    setActiveWorkspaceId: (id: number) => {
        localStorage.setItem(STORAGE_KEY, String(id));
        set({ activeWorkspaceId: id });
    },
}));
