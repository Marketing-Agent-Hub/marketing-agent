import type { ReactNode } from 'react';
import type { WorkspaceRole } from '@/types';

interface PermissionGuardProps {
    roles: WorkspaceRole[];
    userRole?: WorkspaceRole;
    children: ReactNode;
    fallback?: ReactNode;
}

export default function PermissionGuard({
    roles,
    userRole,
    children,
    fallback = null,
}: PermissionGuardProps) {
    if (!userRole || !roles.includes(userRole)) {
        return <>{fallback}</>;
    }
    return <>{children}</>;
}
