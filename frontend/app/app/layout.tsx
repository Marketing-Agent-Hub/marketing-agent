'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { token } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (!token) router.replace('/login');
    }, [token, router]);

    if (!token) return null;

    return <AppShell>{children}</AppShell>;
}
