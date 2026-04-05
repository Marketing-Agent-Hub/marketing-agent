'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLogin } from '@/hooks/use-auth';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const login = useLogin();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login.mutate({ email, password });
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <Link href="/" className="text-lg font-semibold text-zinc-900">Marketing Agent</Link>
                    <h1 className="mt-4 text-2xl font-bold text-zinc-900">Sign in</h1>
                    <p className="mt-1 text-sm text-zinc-500">Welcome back</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {login.error && (
                        <p className="text-sm text-red-600">
                            {(login.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Incorrect email or password.'}
                        </p>
                    )}

                    <Button type="submit" className="w-full" loading={login.isPending}>
                        Sign in
                    </Button>
                </form>

                <p className="mt-4 text-center text-sm text-zinc-500">
                    Don&apos;t have an account?{' '}
                    <Link href="/register" className="font-medium text-zinc-900 hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}
