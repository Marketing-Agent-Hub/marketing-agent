import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

/**
 * Handles two callback scenarios:
 *
 * 1. Magic link: backend redirects to /auth/callback?token=<jwt>
 *    → set token and navigate to app
 *
 * 2. Google OAuth popup: Google redirects to /auth/callback#id_token=...
 *    → send id_token to parent window via postMessage, then close self
 */
export default function MagicLinkCallbackPage() {
    const [searchParams] = useSearchParams();
    const { setToken } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        // Case 2: Google OAuth popup — id_token in URL fragment
        const fragment = new URLSearchParams(window.location.hash.slice(1));
        const idToken = fragment.get('id_token');
        if (idToken) {
            // Send to parent window and close popup
            if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_ID_TOKEN', idToken }, window.location.origin);
            }
            window.close();
            return;
        }

        // Case 1: Magic link — token in query string
        const token = searchParams.get('token');
        if (token) {
            setToken(token);
            const role = useAuthStore.getState().user?.systemRole;
            navigate(role === 'ADMIN' ? '/admin/dashboard' : '/workspaces', { replace: true });
            return;
        }

        // No token found
        navigate('/login', { replace: true });
    }, [searchParams, setToken, navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-[var(--color-bg)]">
            <div className="text-center">
                <div className="mb-4 text-2xl">🔐</div>
                <p className="text-sm text-[var(--color-text-muted)]">Đang xác thực...</p>
            </div>
        </div>
    );
}
