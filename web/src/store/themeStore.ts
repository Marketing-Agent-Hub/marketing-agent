import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme =
    | 'dark'
    | 'light'
    | 'sepia'
    | 'midnight'
    | 'forest'
    | 'rose'
    | 'auto';

export interface ThemeMeta {
    id: Theme;
    label: string;
    icon: string;
    preview: string; // CSS color for swatch
}

export const THEMES: ThemeMeta[] = [
    { id: 'auto', label: 'Auto', icon: '🌗', preview: 'linear-gradient(135deg, #fff 50%, #0a0a0f 50%)' },
    { id: 'dark', label: 'Dark', icon: '🌑', preview: '#0a0a0f' },
    { id: 'light', label: 'Light', icon: '☀️', preview: '#f8fafc' },
    { id: 'sepia', label: 'Sepia', icon: '📜', preview: '#f5f0e8' },
    { id: 'midnight', label: 'Midnight', icon: '🌌', preview: '#0d0d2b' },
    { id: 'forest', label: 'Forest', icon: '🌲', preview: '#0d1f0d' },
    { id: 'rose', label: 'Rose', icon: '🌸', preview: '#1a0d12' },
];

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',
            setTheme: (theme) => {
                set({ theme });
                applyTheme(theme);
            },
        }),
        { name: 'app-theme' }
    )
);

/** Apply theme by setting data-theme attribute on <html> */
export function applyTheme(theme: Theme) {
    const resolved = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : theme;
    document.documentElement.setAttribute('data-theme', resolved);
}

/** Call once on app boot to restore persisted theme */
export function initTheme() {
    const stored = localStorage.getItem('app-theme');
    let theme: Theme = 'dark';
    try {
        const parsed = JSON.parse(stored ?? '{}');
        theme = parsed?.state?.theme ?? 'dark';
    } catch { /* ignore */ }
    applyTheme(theme);

    // Watch system preference changes for Auto mode
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const current = useThemeStore.getState().theme;
        if (current === 'auto') applyTheme('auto');
    });
}
