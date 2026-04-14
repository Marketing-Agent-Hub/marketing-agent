import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useBrands } from '@/hooks/useBrands';
import { cn } from '@/lib/utils';

export default function ContextSwitcher() {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const navigate = useNavigate();
    const { workspaceId, brandId } = useParams<{ workspaceId?: string; brandId?: string }>();
    const wid = Number(workspaceId) || 0;

    const { data: workspaces } = useWorkspaces();
    const { data: brands } = useBrands(wid);

    const currentBrand = brands?.find((b) => b.id === Number(brandId));
    const currentWorkspace = workspaces?.find((w) => w.id === wid);

    const filteredBrands = brands?.filter((b) =>
        b.name.toLowerCase().includes(search.toLowerCase()),
    );
    const filteredWorkspaces = workspaces?.filter((w) =>
        w.name.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
            >
                <span className="truncate font-medium text-[var(--color-text)]">
                    {currentBrand?.name ?? currentWorkspace?.name ?? 'Chọn Brand'}
                </span>
                <span className="ml-auto text-[var(--color-text-muted)]">▾</span>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
                        <div className="p-2">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm kiếm..."
                                className="w-full rounded-lg bg-white/5 px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)]"
                            />
                        </div>

                        {filteredBrands && filteredBrands.length > 0 && (
                            <div className="px-2 pb-1">
                                <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Brands
                                </p>
                                {filteredBrands.map((brand) => (
                                    <button
                                        key={brand.id}
                                        onClick={() => {
                                            navigate(`/b/${brand.id}/strategy`);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
                                            brand.id === Number(brandId)
                                                ? 'bg-[#4FACFE]/10 text-[#4FACFE]'
                                                : 'text-[var(--color-text)] hover:bg-white/5',
                                        )}
                                    >
                                        🎯 {brand.name}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filteredWorkspaces && filteredWorkspaces.length > 0 && (
                            <div className="border-t border-[var(--color-border)] px-2 py-1">
                                <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                                    Workspaces
                                </p>
                                {filteredWorkspaces.map((ws) => (
                                    <button
                                        key={ws.id}
                                        onClick={() => {
                                            navigate(`/w/${ws.id}/brands`);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors',
                                            ws.id === wid
                                                ? 'bg-[#4FACFE]/10 text-[#4FACFE]'
                                                : 'text-[var(--color-text)] hover:bg-white/5',
                                        )}
                                    >
                                        🏢 {ws.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
