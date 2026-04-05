import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            {Icon && (
                <div className="mb-4 rounded-full bg-zinc-100 p-4">
                    <Icon className="h-8 w-8 text-zinc-400" />
                </div>
            )}
            <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-zinc-500 max-w-sm">{description}</p>}
            {action && (
                <Button className="mt-4" onClick={action.onClick}>
                    {action.label}
                </Button>
            )}
        </div>
    );
}
