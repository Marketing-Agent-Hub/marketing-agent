import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { decodeAppToken } from '@/lib/jwt';
import apiClient from '@/api/client';

function getRedirectTarget(token: string): string {
    const payload = decodeAppToken(token);
    const role = payload?.systemRole;
    const saved = sessionStorage.getItem('auth_redirect');
    sessionStorage.removeItem('auth_redirect');
    if (role === 'ADMIN') return '/admin/dashboard';
    return saved ?? '/workspaces';
}

/**
 * Handles two callback scenarios:
 *
 * 1. Magic link: backend redirects to /auth/callback?token=<jwt>
 *
 * 2. Google OAuth redirect: Google redirects to /auth/callback#id_token=...
 *    → exchange id_token with backend → get app JWT → navigate
 */
export default function MagicLinkCallbackPage() {
    const [searchParams] = useSearchParams();
    const { setToken } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        // Case 2: Google OAuth redirect — id_token in URL fragment
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const idToken = fragment.get('id_token');
        if (idToken) {
            apiClient
                .post<{ token: string }>('/api/accounts/auth/google', { idToken })
                .then((res) => {
                    const jwt = res.data.token;
                    setToken(jwt);
                    navigate(getRedirectTarget(jwt), { replace: true });
                })
                .catch(() => {
                    navigate('/login', { replace: true });
                });
            return;
        }

        // Case 1: Magic link — app JWT in query string
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            navigate(getRedirectTarget(token), { replace: true });
            return;
        }

        // No token found
        navigate('/login', { replace: true });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
            <div className="text-center">
                <div className="mb-4 text-2xl">🔐</div>
                <p className="text-sm text-[var(--color-text-muted)]">Đang xác thực...</p>
            </div>
        </div>
    );
}
