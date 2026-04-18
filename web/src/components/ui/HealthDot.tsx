import type { ServiceHealthStatus } from '@/types';

interface HealthDotProps {
    status: ServiceHealthStatus;
    label?: string;
}

const statusMap: Record<ServiceHealthStatus, { emoji: string; color: string }> = {
    UP: { emoji: '🟢', color: '#22c55e' },
    DEGRADED: { emoji: '🟡', color: '#eab308' },
    DOWN: { emoji: '🔴', color: '#ef4444' },
};

export default function HealthDot({ status, label }: HealthDotProps) {
    const entry = statusMap[status] ?? statusMap.DOWN;
    return (
        <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color: entry.color }}>
            {entry.emoji} {label && <span>{label}</span>}
        </span>
    );
}
