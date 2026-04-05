'use client';
import { useState } from 'react';
import { useWorkspaceStore } from '@/store/workspace';
import { useAuthStore } from '@/store/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
    const { activeWorkspace } = useWorkspaceStore();
    const { user } = useAuthStore();

    return (
        <div className="px-8 py-8 max-w-2xl space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
                <p className="text-sm text-zinc-500 mt-1">Workspace and account settings</p>
            </div>

            {/* Workspace info */}
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-semibold text-zinc-900 mb-4">Workspace</h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Name</p>
                        <p className="text-sm font-medium text-zinc-900">{activeWorkspace?.name ?? '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Slug</p>
                        <p className="text-sm text-zinc-600">/{activeWorkspace?.slug ?? '—'}</p>
                    </div>
                </div>
            </section>

            {/* Account info */}
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
                <h2 className="text-base font-semibold text-zinc-900 mb-4">Account</h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Email</p>
                        <p className="text-sm font-medium text-zinc-900">{user?.email ?? '—'}</p>
                    </div>
                    {user?.name && (
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Name</p>
                            <p className="text-sm text-zinc-900">{user.name}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
