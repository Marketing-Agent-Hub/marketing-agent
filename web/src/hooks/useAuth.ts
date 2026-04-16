import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export function useAuth() {
    const { user, token, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const logout = () => {
        clearAuth();
        navigate('/login', { replace: true });
    };

    return {
        user,
        token,
        systemRole: user?.systemRole ?? null,
        isAuthenticated: !!token,
        logout,
    };
}
