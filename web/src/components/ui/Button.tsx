import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'destructive';
    loading?: boolean;
    children: ReactNode;
}

export default function Button({
    variant = 'primary',
    loading = false,
    disabled,
    children,
    className,
    ...props
}: ButtonProps) {
    const base =
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary:
            'bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] text-black hover:opacity-90 active:scale-95',
        ghost:
            'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-white/5 active:scale-95',
        destructive:
            'border border-red-500 text-red-400 hover:bg-red-500/10 active:scale-95',
    };

    return (
        <button
            className={cn(base, variants[variant], className)}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {children}
        </button>
    );
}
