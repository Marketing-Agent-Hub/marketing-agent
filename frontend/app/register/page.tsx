'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRegister } from '@/hooks/use-auth';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const register = useRegister();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        register.mutate({ name, email, password });
    };

    return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <Link href="/" className="text-lg font-semibold text-zinc-900">Marketing Agent</Link>
                    <h1 className="mt-4 text-2xl font-bold text-zinc-900">Create account</h1>
                    <p className="mt-1 text-sm text-zinc-500">Start building your brand presence</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4">
                    <Input
                        label="Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        autoFocus
                    />
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 characters"
                        minLength={8}
                        required
                    />

                    {register.error && (
                        <p className="text-sm text-red-600">
                            {(register.error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Registration failed. Please try again.'}
                        </p>
                    )}

                    <Button type="submit" className="w-full" loading={register.isPending}>
                        Create account
                    </Button>
                </form>

                <p className="mt-4 text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-zinc-900 hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
