import type { ReactNode } from 'react';

interface FieldWrapperProps {
    label: string;
    fieldKey: string;
    fieldLoadingKey: string | null;
    onAISuggest: (fieldKey: string) => void;
    error?: string;
    children: ReactNode;
}

export default function FieldWrapper({
    label,
    fieldKey,
    fieldLoadingKey,
    onAISuggest,
    error,
    children,
}: FieldWrapperProps) {
    const isLoading = fieldLoadingKey === fieldKey;
    const isAnyLoading = fieldLoadingKey !== null;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--color-text)]">{label}</label>
                <button
                    type="button"
                    onClick={() => onAISuggest(fieldKey)}
                    disabled={isLoading || isAnyLoading}
                    className="flex items-center gap-1 text-xs text-[#4FACFE] hover:underline disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                    {isLoading ? (
                        <span className="inline-block animate-spin">⟳</span>
                    ) : (
                        <span>✨</span>
                    )}
                    {isLoading ? 'Đang gợi ý...' : 'AI Suggest'}
                </button>
            </div>
            {children}
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}
