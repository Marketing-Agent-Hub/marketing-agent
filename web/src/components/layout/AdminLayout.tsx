import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import HealthDot from '@/components/ui/HealthDot';
import apiClient from '@/api/client';
import type { HealthStatus } from '@/types';

const sidebarSections = [
    {
        label: 'Core Status',
        items: [
            { label: 'Dashboard', path: '/admin/dashboard', icon: '📊' },
        ],
    },
    {
        label: 'Pipeline Config',
        items: [
            { label: 'AI Settings', path: '/admin/ai-settings', icon: '⚙️' },
            { label: 'Sources', path: '/admin/sources', icon: '📡' },
        ],
    },
    {
        label: 'Observability',
        items: [
            { label: 'Monitoring', path: '/admin/monitoring', icon: '🖥️' },
            { label: 'Source Discovery', path: '/admin/source-discovery', icon: '🔍' },
        ],
    },
];

export default function AdminLayout() {
    const { user, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const { data: health } = useQuery<HealthStatus>({
        queryKey: ['admin-health'],
        queryFn: () => apiClient.get('/api/internal/monitor/health').then((r) => r.data.data),
        refetchInterval: 10_000,
    });

    const handleLogout = () => {
        clearAuth();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-[#000000] text-[#e2e8f0] font-mono text-sm">
            {/* Sidebar */}
            <aside className="flex w-48 flex-col border-r border-white/10 bg-[#111111]">
                {/* Logo */}
                <div className="flex h-10 items-center border-b border-white/10 px-3">
                    <span className="text-xs font-bold text-[#4FACFE]">ADMIN</span>
                </div>

                {/* Navigation sections */}
                <nav className="flex-1 overflow-y-auto py-2">
                    {sidebarSections.map((section) => (
                        <div key={section.label} className="mb-3">
                            <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-white/30">
                                {section.label}
                            </div>
                            {section.items.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-2 px-3 py-1.5 text-xs transition-colors',
                                            isActive
                                                ? 'bg-[#4FACFE]/10 text-[#4FACFE]'
                                                : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                                        )
                                    }
                                >
                                    <span>{item.icon}</span>
                                    <span>{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User */}
                <div className="border-t border-white/10 p-2">
                    <div className="mb-1 truncate px-1 text-[10px] text-white/30">{user?.email}</div>
                    <button
                        onClick={handleLogout}
                        className="w-full px-2 py-1 text-left text-xs text-red-400/70 hover:text-red-400 transition-colors"
                    >
                        logout
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header with Live Health Bar */}
                <header className="flex h-10 items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-4">
                    <span className="text-xs text-white/30">admin panel</span>
                    <div className="flex items-center gap-4 font-mono text-xs">
                        {health ? (
                            <>
                                <span>DB: <HealthDot status={health.services.find(s => s.service === 'database')?.status ?? 'DOWN'} /></span>
                                <span>AI API: <HealthDot status={health.services.find(s => s.service === 'openai')?.status ?? 'DOWN'} /></span>
                                <span>Server: <HealthDot status={health.overall} /></span>
                            </>
                        ) : (
                            <span className="text-white/30">connecting...</span>
                        )}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
