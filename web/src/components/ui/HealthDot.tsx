interface HealthDotProps {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    label?: string;
}

const statusMap = {
    HEALTHY: { emoji: '🟢', color: '#22c55e' },
    DEGRADED: { emoji: '🟡', color: '#eab308' },
    UNHEALTHY: { emoji: '🔴', color: '#ef4444' },
};

export default function HealthDot({ status, label }: HealthDotProps) {
    const { emoji, color } = statusMap[status];
    return (
        <span className="inline-flex items-center gap-1 font-mono text-xs" style={{ color }}>
            {emoji} {label && <span>{label}</span>}
        </span>
    );
}
