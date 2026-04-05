import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
    return (
        <span
            className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                {
                    'bg-zinc-100 text-zinc-700': variant === 'default',
                    'bg-green-100 text-green-700': variant === 'success',
                    'bg-yellow-100 text-yellow-700': variant === 'warning',
                    'bg-red-100 text-red-700': variant === 'danger',
                    'bg-blue-100 text-blue-700': variant === 'info',
                    'bg-zinc-50 text-zinc-500': variant === 'muted',
                },
                className
            )}
        >
            {children}
        </span>
    );
}

// Map draft/brief status to badge variant
export function statusVariant(status: string): BadgeVariant {
    switch (status) {
        case 'APPROVED': return 'success';
        case 'PUBLISHED': return 'success';
        case 'REJECTED': return 'danger';
        case 'FAILED': return 'danger';
        case 'SCHEDULED': return 'info';
        case 'IN_REVIEW': case 'READY_FOR_REVIEW': return 'warning';
        case 'DRAFT': return 'muted';
        default: return 'default';
    }
}
