import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import Skeleton from '@/components/ui/Skeleton';

export default function AdminDashboardPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['monitor-overview'],
        queryFn: () => apiClient.get('/api/internal/monitor/overview').then((r) => r.data.data),
        refetchInterval: 30_000,
    });

    const stats = [
        { label: 'Total Logs (24h)', value: data?.logs?.total?.toLocaleString() ?? '—', icon: '📡' },
        { label: 'Recent Errors', value: data?.logs?.recentErrors?.toLocaleString() ?? '—', icon: '⚠️' },
        { label: 'Total Metrics', value: data?.metrics?.total?.toLocaleString() ?? '—', icon: '🔄' },
        { label: 'Slow Traces', value: data?.traces?.slowCount?.toLocaleString() ?? '—', icon: '⚙️' },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="font-mono text-lg font-bold text-white">System Overview</h1>
                <p className="text-xs text-white/40">Last 24 hours · auto-refresh 30s</p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 text-xl">{stat.icon}</div>
                        {isLoading ? (
                            <Skeleton variant="text" className="mb-1 h-6 w-24" />
                        ) : (
                            <p className="font-mono text-2xl font-bold text-white">{stat.value}</p>
                        )}
                        <p className="text-[10px] uppercase tracking-wider text-white/40">{stat.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
