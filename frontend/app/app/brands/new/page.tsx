'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateBrand } from '@/hooks/use-brands';
import { useWorkspaceStore } from '@/store/workspace';

const INDUSTRIES = [
    'Technology', 'E-commerce', 'Healthcare', 'Finance', 'Education',
    'Food & Beverage', 'Fashion', 'Real Estate', 'Media', 'Other',
];

export default function NewBrandPage() {
    const [name, setName] = useState('');
    const [industry, setIndustry] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const create = useCreateBrand();
    const { activeWorkspace } = useWorkspaceStore();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        create.mutate({ name: name.trim(), industry: industry || undefined, websiteUrl: websiteUrl || undefined });
    };

    return (
        <div className="max-w-md mx-auto px-6 py-16">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Create brand</h1>
            <p className="text-sm text-zinc-500 mb-8">
                Your brand is the business identity the AI will learn and generate content for.
                {activeWorkspace && <span className="block mt-1">Workspace: <strong>{activeWorkspace.name}</strong></span>}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Brand name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    autoFocus
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-700">Industry</label>
                    <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    >
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>

                <Input
                    label="Website URL (optional)"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                />

                {create.error && (
                    <p className="text-sm text-red-600">Failed to create brand. Please try again.</p>
                )}

                <Button type="submit" className="w-full" loading={create.isPending} disabled={!name.trim()}>
                    Create brand
                </Button>
            </form>
        </div>
    );
}
