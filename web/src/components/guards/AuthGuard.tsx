import { Navigate, useLocation, Outlet } from 'react-router-dom';

export default function AuthGuard() {
    const location = useLocation();
    const token = localStorage.getItem('app_token');

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <Outlet />;
}
