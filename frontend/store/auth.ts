'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/types';

interface AuthState {
    token: string | null;
    user: User | null;
    setAuth: (token: string, user: User) => void;
    clearAuth: () => void;
    isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            setAuth: (token, user) => {
                localStorage.setItem('token', token);
                set({ token, user });
            },
            clearAuth: () => {
                localStorage.removeItem('token');
                set({ token: null, user: null });
            },
            isAuthenticated: () => !!get().token,
        }),
        { name: 'auth-storage', partialize: (s) => ({ token: s.token, user: s.user }) }
    )
);
