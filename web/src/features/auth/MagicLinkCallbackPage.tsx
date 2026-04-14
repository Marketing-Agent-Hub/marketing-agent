import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function MagicLinkCallbackPage() {
    const [searchParams] = useSearchParams();
    const { setToken } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }
        setToken(token);
        const role = useAuthStore.getState().user?.systemRole;
        navigate(role === 'ADMIN' ? '/admin/dashboard' : '/workspaces', { replace: true });
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
