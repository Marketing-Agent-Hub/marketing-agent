import { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import WorkspaceSwitcher from '@/components/layout/WorkspaceSwitcher';
import BrandSwitcher from '@/components/layout/BrandSwitcher';
import { useReviewQueue } from '@/hooks/useReviewQueue';
import ThemeSwitcher from '@/components/ui/ThemeSwitcher';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useBrands } from '@/hooks/useBrands';

function ReviewQueueBadge({ brandId }: { brandId: number }) {
    const { data } = useReviewQueue(brandId);
    const count = data?.length ?? 0;
    if (!count) return null;
    return (
        <span className="ml-auto rounded-full bg-[#4FACFE] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-black">
            {count}
        </span>
    );
}

export default function ProductLayout() {
    const { sidebarCollapsed, toggleSidebar, setActiveWorkspaceId } = useUiStore();
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();
    const { brandId, workspaceId } = useParams<{ brandId?: string; workspaceId?: string }>();
    const bid = Number(brandId) || 0;

    // Sync URL workspaceId → store so brand-only routes (/b/:brandId/*) can resolve it
    useEffect(() => {
        const wid = Number(workspaceId);
        if (wid) setActiveWorkspaceId(wid);
    }, [workspaceId, setActiveWorkspaceId]);

    const navItems = [
        ...(brandId ? [
            { label: 'Strategy', path: `/b/${brandId}/strategy`, icon: '📅' },
            { label: 'Review Queue', path: `/b/${brandId}/review-queue`, icon: '✍️', badgeKey: 'review-queue' as const },
            { label: 'Publishing', path: `/b/${brandId}/publishing`, icon: '📤' },
            { label: 'Sources', path: `/b/${brandId}/sources`, icon: '📡' },
            { label: 'Onboarding', path: `/b/${brandId}/onboarding`, icon: '🎯' },
        ] : []),
    ];

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-['Inter',sans-serif]">
            {/* Sidebar */}
            <aside
                className={cn(
                    'flex flex-col border-r border-[var(--color-border)] transition-all duration-200',
                    sidebarCollapsed ? 'w-16' : 'w-60'
                )}
                style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}
            >
                {/* Logo */}
                <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--color-border)]">
                    {!sidebarCollapsed && (
                        <span className="font-['Outfit',sans-serif] font-semibold text-sm bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] bg-clip-text text-transparent">
                            Marketing Agent
                        </span>
                    )}
                    <button
                        onClick={toggleSidebar}
                        className="ml-auto rounded p-1 hover:bg-white/10 transition-colors text-[var(--color-text-muted)]"
                        aria-label="Toggle sidebar"
                    >
                        {sidebarCollapsed ? '→' : '←'}
                    </button>
                </div>

                {/* Workspace Switcher */}
                {!sidebarCollapsed && (
                    <div className="px-0 pt-1">
                        <WorkspaceSwitcher />
                    </div>
                )}

                {/* Brand Switcher */}
                {!sidebarCollapsed && (
                    <div className="border-b border-[var(--color-border)] pb-1">
                        <BrandSwitcher />
                    </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={'exact' in item ? item.exact : false}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mb-1',
                                    isActive
                                        ? 'bg-[#4FACFE]/10 text-[#4FACFE]'
                                        : 'text-[var(--color-text-muted)] hover:bg-white/5 hover:text-[var(--color-text)]'
                                )
                            }
                        >
                            <span>{item.icon}</span>
                            {!sidebarCollapsed && (
                                <>
                                    <span className="flex-1">{item.label}</span>
                                    {'badgeKey' in item && item.badgeKey === 'review-queue' && bid > 0 && (
                                        <ReviewQueueBadge brandId={bid} />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* User profile */}
                <div className="border-t border-[var(--color-border)] p-3">
                    {!sidebarCollapsed && (
                        <div className="mb-2 text-xs text-[var(--color-text-muted)] truncate">{user?.email}</div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors text-left"
                    >
                        {sidebarCollapsed ? '🚪' : '🚪 Logout'}
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header
                    className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-6"
                    style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)' }}
                >
                    <Breadcrumbs />
                    <div className="flex items-center gap-3">
                        <ThemeSwitcher variant="icon" />
                        <button
                            className="rounded-lg p-2 hover:bg-white/5 transition-colors text-[var(--color-text-muted)]"
                            aria-label="Notifications"
                        >
                            🔔
                        </button>
                        <span className="text-xs text-[var(--color-text-muted)]">{user?.email}</span>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

const TAB_LABELS: Record<string, string> = {
    strategy: 'Strategy',
    'review-queue': 'Review Queue',
    publishing: 'Publishing',
    sources: 'Sources',
    onboarding: 'Onboarding',
    brands: 'Brands',
    workspaces: 'Workspaces',
    preview: 'Preview',
};

function Breadcrumbs() {
    const { workspaceId, brandId } = useParams<{ workspaceId?: string; brandId?: string }>();
    const { activeWorkspaceId } = useUiStore();
    const location = useLocation();

    const wid = Number(workspaceId) || activeWorkspaceId;
    const bid = Number(brandId) || 0;

    const { data: workspaces } = useWorkspaces();
    const { data: brands } = useBrands(wid);

    const workspace = workspaces?.find((w) => w.id === wid);
    const brand = brands?.find((b) => b.id === bid);

    // Determine the current tab from the last path segment
    const segments = location.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const tabLabel = TAB_LABELS[lastSegment] ?? null;

    // Build breadcrumb parts: only include non-null items
    const crumbs: { label: string; muted: boolean }[] = [];

    if (workspace) crumbs.push({ label: workspace.name, muted: true });
    if (brand) crumbs.push({ label: brand.name, muted: true });
    if (tabLabel && tabLabel !== crumbs[crumbs.length - 1]?.label) {
        crumbs.push({ label: tabLabel, muted: false });
    }

    // Fallback: raw last segment if nothing resolved
    if (crumbs.length === 0 && lastSegment) {
        crumbs.push({ label: TAB_LABELS[lastSegment] ?? lastSegment, muted: false });
    }

    return (
        <nav className="flex items-center gap-1.5 text-xs">
            {crumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && (
                        <span className="text-[var(--color-text-muted)] opacity-40">/</span>
                    )}
                    <span
                        className={cn(
                            crumb.muted
                                ? 'text-[var(--color-text-muted)]'
                                : 'font-medium text-[var(--color-text)]'
                        )}
                    >
                        {crumb.label}
                    </span>
                </span>
            ))}
        </nav>
    );
}
