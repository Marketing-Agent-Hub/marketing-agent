import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={clsx('animate-pulse rounded-md bg-zinc-100', className)} />
    );
}

export function SkeletonCard() {
    return (
        <div className="rounded-xl border border-zinc-100 p-4 space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    );
}
