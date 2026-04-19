import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspaces';
import { useUiStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';

interface CreateWorkspaceModalProps {
    onClose: () => void;
}

function CreateWorkspaceModal({ onClose }: CreateWorkspaceModalProps) {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const createMutation = useCreateWorkspace();

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        await createMutation.mutateAsync({ name: name.trim() });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-2xl"
                style={{ animation: 'scaleIn 0.15s ease-out' }}
            >
                <h2 className="mb-1 font-['Outfit',sans-serif] text-base font-semibold text-[var(--color-text)]">
                    Create a new workspace
                </h2>
                <p className="mb-4 text-xs text-[var(--color-text-muted)]">
                    Workspaces help you organize teams and brands.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
                            Workspace name
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Acme Corp"
                            className="w-full rounded-lg border border-[var(--color-border)] bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[#4FACFE]/60 focus:ring-2 focus:ring-[#4FACFE]/20 transition-all"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!name.trim() || createMutation.isPending}
                            className="rounded-lg bg-[#4FACFE] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#4FACFE]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {createMutation.isPending ? 'Creating…' : 'Create workspace'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.96) translateY(4px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function WorkspaceSwitcher() {
    const [open, setOpen] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { workspaceId } = useParams<{ workspaceId?: string }>();
    const { activeWorkspaceId, setActiveWorkspaceId } = useUiStore();

    // Use URL param first, fall back to persisted store value
    const wid = Number(workspaceId) || activeWorkspaceId;

    const { data: workspaces } = useWorkspaces();
    const currentWorkspace = workspaces?.find((w) => w.id === wid);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleSelect = (ws: Workspace) => {
        setActiveWorkspaceId(ws.id);
        navigate(`/w/${ws.id}/brands`);
        setOpen(false);
    };

    return (
        <>
            <div ref={wrapperRef} className="relative px-2 py-1">
                {/* Trigger button */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-150"
                    style={{ background: open ? 'var(--sidebar-item-hover)' : undefined }}
                    onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-item-hover)'; }}
                    onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLElement).style.background = ''; }}
                >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-sm">🏢</span>
                    <span className="flex-1 truncate text-left font-medium text-[var(--color-text)]">
                        {currentWorkspace?.name ?? 'Select workspace'}
                    </span>
                    <svg
                        className={cn('h-3.5 w-3.5 text-[var(--color-text-muted)] transition-transform duration-150', open && 'rotate-180')}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Dropdown */}
                {open && (
                    <div className="absolute left-2 right-2 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl"
                        style={{ animation: 'dropdownIn 0.12s ease-out' }}
                    >
                        {/* Label */}
                        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                            Workspaces
                        </div>

                        {/* Workspace list */}
                        <div className="max-h-48 overflow-y-auto pb-1">
                            {workspaces?.map((ws) => (
                                <button
                                    key={ws.id}
                                    onClick={() => handleSelect(ws)}
                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-all duration-100"
                                    style={{
                                        background: ws.id === wid ? 'var(--sidebar-item-active)' : undefined,
                                        color: ws.id === wid ? 'var(--sidebar-item-active-text)' : 'var(--color-text)',
                                    }}
                                    onMouseEnter={(e) => { if (ws.id !== wid) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-item-hover)'; }}
                                    onMouseLeave={(e) => { if (ws.id !== wid) (e.currentTarget as HTMLElement).style.background = ''; }}
                                >
                                    <span className="text-sm">🏢</span>
                                    <span className="flex-1 truncate text-left">{ws.name}</span>
                                    {ws.id === wid && (
                                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}

                            {!workspaces?.length && (
                                <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">No workspaces yet</p>
                            )}
                        </div>

                        {/* Divider + Add button */}
                        <div className="border-t border-[var(--color-border)] p-1">
                            <button
                                onClick={() => { setOpen(false); setShowCreate(true); }}
                                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-text-muted)] transition-all duration-100"
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-item-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)'; }}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Add a workspace
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}

            <style>{`
                @keyframes dropdownIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
