import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { decodeAppToken } from '@/lib/jwt';

export default function AdminGuard() {
    const location = useLocation();
    const token = localStorage.getItem('app_token');

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const payload = decodeAppToken(token);
    if (!payload || payload.systemRole !== 'ADMIN') {
        // TODO: show toast "You do not have permission to access this area" once Toast is wired up
        return <Navigate to="/workspaces" replace />;
    }

    return <Outlet />;
}
