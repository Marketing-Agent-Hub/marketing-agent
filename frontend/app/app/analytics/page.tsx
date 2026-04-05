'use client';
import { BarChart2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

export default function AnalyticsPage() {
    return (
        <div className="px-8 py-8 max-w-4xl">
            <h1 className="text-2xl font-bold text-zinc-900 mb-8">Analytics</h1>
            <EmptyState
                icon={BarChart2}
                title="Analytics coming soon"
                description="Performance data will appear here once you start publishing content."
            />
        </div>
    );
}
