'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateWorkspace } from '@/hooks/use-workspaces';

export default function NewWorkspacePage() {
    const [name, setName] = useState('');
    const create = useCreateWorkspace();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length >= 2) create.mutate({ name: name.trim() });
    };

    return (
        <div className="max-w-md mx-auto px-6 py-16">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">Create workspace</h1>
            <p className="text-sm text-zinc-500 mb-8">
                Your workspace is the top-level container for your brands and team.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Workspace name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corp"
                    required
                    minLength={2}
                    autoFocus
                    error={create.error ? 'Failed to create workspace. Please try again.' : undefined}
                />
                <Button type="submit" className="w-full" loading={create.isPending} disabled={name.trim().length < 2}>
                    Create workspace
                </Button>
            </form>
        </div>
    );
}
