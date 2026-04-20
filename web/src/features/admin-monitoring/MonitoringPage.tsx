import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import JsonViewer from '@/components/ui/JsonViewer';

type MonitoringOverviewResponse = {
    health?: {
        overall?: string;
        services?: Array<{
            service: string;
            status: string;
            lastCheck?: string;
            responseTimeMs?: number;
        }>;
    };
    metrics?: {
        total?: number;
        recentCount?: number;
    };
    traces?: {
        total?: number;
        avgDuration?: number;
        slowCount?: number;
    };
    timestamp?: string;
};

export default function MonitoringPage() {
    const { data, isLoading, isError } = useQuery<MonitoringOverviewResponse>({
        queryKey: ['monitor-overview'],
        queryFn: () => apiClient.get('/api/internal/monitor/overview').then((r) => r.data.data ?? {}),
        refetchInterval: 10000,
    });

    if (isLoading) {
        return <div className="text-sm text-[var(--color-text-muted)]">Loading monitoring overview...</div>;
    }

    if (isError) {
        return <div className="text-sm text-red-500">Cannot load monitoring overview.</div>;
    }

    const services = data?.health?.services ?? [];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Card title="System Health" value={data?.health?.overall ?? 'UNKNOWN'} />
                <Card title="Metrics (24h)" value={String(data?.metrics?.total ?? 0)} />
                <Card title="Metrics (1h)" value={String(data?.metrics?.recentCount ?? 0)} />
                <Card title="Slow Traces (24h)" value={String(data?.traces?.slowCount ?? 0)} />
            </div>

            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Services</h3>
                {services.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)]">No service health data.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                                    <th className="px-2 py-2">Service</th>
                                    <th className="px-2 py-2">Status</th>
                                    <th className="px-2 py-2">Response</th>
                                    <th className="px-2 py-2">Last Check</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map((service) => (
                                    <tr key={service.service} className="border-b border-[var(--color-border)] last:border-0">
                                        <td className="px-2 py-2 text-[var(--color-text)]">{service.service}</td>
                                        <td className="px-2 py-2 text-[var(--color-text)]">{service.status}</td>
                                        <td className="px-2 py-2 text-[var(--color-text-muted)]">
                                            {service.responseTimeMs != null ? `${service.responseTimeMs} ms` : '-'}
                                        </td>
                                        <td className="px-2 py-2 text-[var(--color-text-muted)]">
                                            {service.lastCheck ? new Date(service.lastCheck).toLocaleString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
                <h3 className="mb-2 text-sm font-semibold text-[var(--color-text)]">Raw Overview Payload</h3>
                <JsonViewer data={data ?? {}} />
            </div>
        </div>
    );
}

function Card({ title, value }: { title: string; value: string }) {
    return (
        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
            <div className="text-xs text-[var(--color-text-muted)]">{title}</div>
            <div className="mt-1 text-lg font-semibold text-[var(--color-text)]">{value}</div>
        </div>
    );
}
