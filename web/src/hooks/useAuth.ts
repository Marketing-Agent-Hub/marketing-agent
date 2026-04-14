import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';

export function useAuth() {
    const { user, token, setToken, clearAuth } = useAuthStore();
    const navigate = useNavigate();

    const login = async (email: string, password: string) => {
        const res = await apiClient.post<{ token: string }>('/api/v2/accounts/auth/login', { email, password });
        setToken(res.data.token);
        const role = useAuthStore.getState().user?.systemRole;
        navigate(role === 'ADMIN' ? '/admin/dashboard' : '/workspaces', { replace: true });
    };

    const logout = () => {
        clearAuth();
        navigate('/login', { replace: true });
    };

    return {
        user,
        token,
        systemRole: user?.systemRole ?? null,
        isAuthenticated: !!token,
        login,
        logout,
    };
}
