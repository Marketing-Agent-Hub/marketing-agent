import { useState, useRef, useEffect } from 'react';
import { useThemeStore, THEMES } from '@/store/themeStore';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
    /** 'icon' shows only the current theme icon; 'full' shows label too */
    variant?: 'icon' | 'full';
    /** For admin panel: use monospace/compact style */
    compact?: boolean;
}

export default function ThemeSwitcher({ variant = 'icon', compact = false }: ThemeSwitcherProps) {
    const [open, setOpen] = useState(false);
    const { theme, setTheme } = useThemeStore();
    const ref = useRef<HTMLDivElement>(null);

    const current = THEMES.find((t) => t.id === theme) ?? THEMES[1];

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                title="Change theme"
                aria-label="Change theme"
                className={cn(
                    'flex items-center gap-1.5 rounded-lg transition-colors',
                    compact
                        ? 'px-2 py-1 text-[10px] text-white/50 hover:text-white/80 hover:bg-white/5'
                        : 'px-2 py-1.5 text-sm hover:bg-white/5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                )}
            >
                <span>{current.icon}</span>
                {variant === 'full' && (
                    <span className={compact ? 'font-mono' : ''}>{current.label}</span>
                )}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div
                        className={cn(
                            'absolute right-0 top-full z-50 mt-1 rounded-xl border shadow-2xl',
                            compact
                                ? 'w-44 border-white/10 bg-[#111111] p-1'
                                : 'w-52 border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-2'
                        )}
                    >
                        <p className={cn(
                            'mb-1 px-2 py-1 uppercase tracking-wider',
                            compact ? 'text-[9px] text-white/30 font-mono' : 'text-[10px] text-[var(--color-text-muted)]'
                        )}>
                            Theme
                        </p>
                        {THEMES.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => { setTheme(t.id); setOpen(false); }}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                                    compact ? 'text-[11px] font-mono' : 'text-sm',
                                    theme === t.id
                                        ? compact
                                            ? 'bg-white/10 text-white'
                                            : 'bg-[var(--color-primary-start)]/10 text-[var(--color-primary-start)]'
                                        : compact
                                            ? 'text-white/60 hover:bg-white/5 hover:text-white'
                                            : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]'
                                )}
                            >
                                {/* Color swatch */}
                                <span
                                    className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20"
                                    style={{ background: t.preview }}
                                />
                                <span>{t.icon}</span>
                                <span className="flex-1">{t.label}</span>
                                {theme === t.id && <span className="text-[10px]">✓</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
