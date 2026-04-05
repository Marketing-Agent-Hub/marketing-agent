'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
    LayoutDashboard, Layers, CalendarDays, Inbox,
    Send, BarChart2, Settings, LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useWorkspaceStore } from '@/store/workspace';
import { useRouter } from 'next/navigation';

const navItems = [
    { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/app/brands', label: 'Brands', icon: Layers },
    { href: '/app/strategy', label: 'Strategy', icon: CalendarDays },
    { href: '/app/review', label: 'Review Queue', icon: Inbox },
    { href: '/app/publishing', label: 'Publishing', icon: Send },
    { href: '/app/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { clearAuth, user } = useAuthStore();
    const { activeWorkspace, activeBrand } = useWorkspaceStore();
    const router = useRouter();

    const handleLogout = () => {
        clearAuth();
        router.push('/login');
    };

    return (
        <aside className="flex flex-col w-60 min-h-screen bg-zinc-950 text-zinc-100 shrink-0">
            {/* Workspace / Brand context */}
            <div className="px-4 py-4 border-b border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Workspace</p>
                <p className="text-sm font-semibold truncate">{activeWorkspace?.name ?? '—'}</p>
                {activeBrand && (
                    <>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mt-2 mb-1">Brand</p>
                        <p className="text-sm font-medium text-zinc-300 truncate">{activeBrand.name}</p>
                    </>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-2 py-4 space-y-0.5">
                {navItems.map(({ href, label, icon: Icon, exact }) => {
                    const active = exact ? pathname === href : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                                active
                                    ? 'bg-zinc-800 text-white'
                                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="px-4 py-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 truncate mb-2">{user?.email}</p>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
