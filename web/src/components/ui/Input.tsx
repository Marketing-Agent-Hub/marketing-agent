import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className, id, ...props }, ref) => {
        const [focused, setFocused] = useState(false);
        const hasValue = Boolean(props.value || props.defaultValue);
        const floated = focused || hasValue;
        const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="relative w-full">
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'peer w-full rounded-lg border bg-white/5 px-4 pt-5 pb-4 text-sm text-[var(--color-text)] outline-none transition-all duration-200',
                        'border-[var(--color-border)]',
                        focused
                            ? 'border-[#4FACFE] shadow-[0_0_0_2px_rgba(79,172,254,0.2)]'
                            : 'hover:border-white/20',
                        error && 'border-red-500',
                        className
                    )}
                    onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
                    onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
                    {...props}
                />
                <label
                    htmlFor={inputId}
                    className={cn(
                        'pointer-events-none absolute left-4 transition-all duration-200 text-[var(--color-text-muted)]',
                        floated ? 'top-1.5 text-xs text-[#4FACFE]' : 'top-3.5 text-sm'
                    )}
                >
                    {label}
                </label>
                {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';
export default Input;
