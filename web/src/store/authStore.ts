import { create } from 'zustand';
import { decodeAppToken } from '@/lib/jwt';
import type { SystemRole } from '@/types';

interface AuthUser {
    userId: number;
    email: string;
    systemRole: SystemRole;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    setToken: (token: string) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    token: localStorage.getItem('app_token'),
    user: (() => {
        const token = localStorage.getItem('app_token');
        if (!token) return null;
        const payload = decodeAppToken(token);
        if (!payload) return null;
        return {
            userId: payload.userId,
            email: payload.email,
            systemRole: payload.systemRole ?? 'USER',
        };
    })(),

    setToken: (token: string) => {
        localStorage.setItem('app_token', token);
        const payload = decodeAppToken(token);
        set({
            token,
            user: payload
                ? {
                    userId: payload.userId,
                    email: payload.email,
                    systemRole: payload.systemRole ?? 'USER',
                }
                : null,
        });
    },

    clearAuth: () => {
        localStorage.removeItem('app_token');
        set({ token: null, user: null });
    },
}));
