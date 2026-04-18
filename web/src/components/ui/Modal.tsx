import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    variant?: 'default' | 'destructive';
    confirmLabel?: string | null;
    onConfirm?: () => void;
    confirmLoading?: boolean;
}

export default function Modal({
    open,
    onClose,
    title,
    children,
    variant = 'default',
    confirmLabel = 'Xác nhận',
    onConfirm,
    confirmLoading,
}: ModalProps) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (open) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className={cn(
                    'glass relative w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200',
                    variant === 'destructive' && 'border-red-500/50'
                )}
            >
                <h2 className="mb-4 text-lg font-semibold text-[var(--color-text)]">{title}</h2>
                <div className="mb-6 text-sm text-[var(--color-text-muted)]">{children}</div>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    {onConfirm && confirmLabel !== null && (
                        <Button
                            variant={variant === 'destructive' ? 'destructive' : 'primary'}
                            onClick={onConfirm}
                            loading={confirmLoading}
                        >
                            {confirmLabel ?? 'Xác nhận'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
