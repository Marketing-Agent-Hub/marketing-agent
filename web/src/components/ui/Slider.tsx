import { cn } from '@/lib/utils';

interface SliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    className?: string;
}

function getSliderColor(value: number): string {
    // Interpolate from blue (#4FACFE) at 0.4 to red (#ef4444) at 0.9
    if (value <= 0.4) return '#4FACFE';
    if (value >= 0.9) return '#ef4444';
    const t = (value - 0.4) / 0.5;
    const r = Math.round(79 + t * (239 - 79));
    const g = Math.round(172 + t * (68 - 172));
    const b = Math.round(254 + t * (68 - 254));
    return `rgb(${r},${g},${b})`;
}

export default function Slider({
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    className,
}: SliderProps) {
    const color = getSliderColor(value);
    const pct = ((value - min) / (max - min)) * 100;

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{
                    accentColor: color,
                    background: `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
                }}
                className="w-full cursor-pointer appearance-none rounded-full h-2"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                <span>0.0</span>
                <span style={{ color }}>{value.toFixed(2)}</span>
                <span>1.0</span>
            </div>
        </div>
    );
}
