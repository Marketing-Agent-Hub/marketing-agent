import { cn } from '@/lib/utils';
import type { SocialPlatform, SlotStatus } from '@/types';

const platformColors: Record<SocialPlatform, string> = {
    FACEBOOK: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    LINKEDIN: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    X: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    TIKTOK: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    INSTAGRAM: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const slotStatusColors: Record<SlotStatus, string> = {
    PLANNED: 'bg-white/5 text-[var(--color-text-muted)] border-white/10',
    BRIEF_READY: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    DRAFT_READY: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    APPROVED: 'bg-green-500/10 text-green-300 border-green-500/20',
    SKIPPED: 'bg-red-500/10 text-red-300/50 border-red-500/10 line-through',
};

interface BadgeProps {
    platform?: SocialPlatform;
    status?: SlotStatus;
    label?: string;
    className?: string;
}

export default function Badge({ platform, status, label, className }: BadgeProps) {
    const colorClass = platform
        ? platformColors[platform]
        : status
            ? slotStatusColors[status]
            : 'bg-white/10 text-[var(--color-text-muted)]';

    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                colorClass,
                className
            )}
        >
            {label ?? platform ?? status}
        </span>
    );
}
