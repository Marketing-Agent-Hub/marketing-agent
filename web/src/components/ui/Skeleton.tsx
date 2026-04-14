import { cn } from '@/lib/utils';

interface SkeletonProps {
    variant?: 'card' | 'text' | 'chip';
    className?: string;
}

export default function Skeleton({ variant = 'text', className }: SkeletonProps) {
    const variants = {
        card: 'h-32 w-full rounded-xl',
        text: 'h-4 w-full rounded',
        chip: 'h-6 w-20 rounded-full',
    };

    return (
        <div
            className={cn(
                'animate-pulse bg-white/10',
                variants[variant],
                className
            )}
        />
    );
}
