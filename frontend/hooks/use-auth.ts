'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { AuthResponse, User } from '@/lib/types';

export function useLogin() {
    const { setAuth } = useAuthStore();
    const router = useRouter();
    return useMutation({
        mutationFn: (data: { email: string; password: string }) =>
            api.post<AuthResponse>('/accounts/login', data).then((r) => r.data),
        onSuccess: (data) => {
            setAuth(data.token, data.user);
            router.push('/app/workspaces');
        },
    });
}

export function useRegister() {
    const { setAuth } = useAuthStore();
    const router = useRouter();
    return useMutation({
        mutationFn: (data: { email: string; password: string; name?: string }) =>
            api.post<AuthResponse>('/accounts/register', data).then((r) => r.data),
        onSuccess: (data) => {
            setAuth(data.token, data.user);
            router.push('/app/workspaces/new');
        },
    });
}

export function useMe() {
    const { token } = useAuthStore();
    return useQuery<User>({
        queryKey: ['me'],
        queryFn: () => api.get<User>('/accounts/me').then((r) => r.data),
        enabled: !!token,
    });
}
