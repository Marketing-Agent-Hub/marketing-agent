import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import AuthGuard from '@/components/guards/AuthGuard';
import AdminGuard from '@/components/guards/AdminGuard';
import ProductLayout from '@/components/layout/ProductLayout';
import AdminLayout from '@/components/layout/AdminLayout';
import { decodeAppToken } from '@/lib/jwt';

// Lazy-loaded pages (placeholders until feature tasks are implemented)
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const MagicLinkCallbackPage = lazy(() => import('@/features/auth/MagicLinkCallbackPage'));
const WorkspaceListPage = lazy(() => import('@/features/workspace/WorkspaceListPage'));
const BrandListPage = lazy(() => import('@/features/brand/BrandListPage'));
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'));
const StrategyCalendarPage = lazy(() => import('@/features/strategy/StrategyCalendarPage'));
const ReviewQueuePage = lazy(() => import('@/features/review-queue/ReviewQueuePage'));
const PublishingDashboardPage = lazy(() => import('@/features/publishing/PublishingDashboardPage'));
const SourcesPage = lazy(() => import('@/features/sources/SourcesPage'));
const AdminDashboardPage = lazy(() => import('@/features/admin-dashboard/AdminDashboardPage'));
const MonitoringPage = lazy(() => import('@/features/admin-monitoring/MonitoringPage'));
const SourceDiscoveryPage = lazy(() => import('@/features/admin-discovery/SourceDiscoveryPage'));
const AISettingsPage = lazy(() => import('@/features/admin-ai-settings/AISettingsPage'));

// Root redirect with 500ms logo loader
function RootRedirect() {
    const navigate = useNavigate();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setReady(true), 500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!ready) return;
        const token = localStorage.getItem('app_token');
        if (!token) {
            navigate('/login', { replace: true });
            return;
        }
        const payload = decodeAppToken(token);
        if (payload?.systemRole === 'ADMIN') {
            navigate('/admin/dashboard', { replace: true });
        } else {
            navigate('/workspaces', { replace: true });
        }
    }, [ready, navigate]);

    // Logo loader placeholder
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div style={{ fontSize: 24, color: '#4FACFE' }}>Marketing Agent</div>
        </div>
    );
}

export default function AppRouter() {
    return (
        <Suspense fallback={<div />}>
            <Routes>
                {/* Root redirect */}
                <Route path="/" element={<RootRedirect />} />

                {/* Public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/callback" element={<MagicLinkCallbackPage />} />

                {/* Product routes — protected by AuthGuard + ProductLayout */}
                <Route element={<AuthGuard />}>
                    <Route element={<ProductLayout />}>
                        <Route path="/workspaces" element={<WorkspaceListPage />} />
                        <Route path="/w/:workspaceId/brands" element={<BrandListPage />} />
                        <Route path="/b/:brandId/onboarding" element={<OnboardingPage />} />
                        <Route path="/b/:brandId/strategy" element={<StrategyCalendarPage />} />
                        <Route path="/b/:brandId/review-queue" element={<ReviewQueuePage />} />
                        <Route path="/b/:brandId/publishing" element={<PublishingDashboardPage />} />
                        <Route path="/b/:brandId/sources" element={<SourcesPage />} />
                    </Route>
                </Route>

                {/* Admin routes — protected by AdminGuard + AdminLayout */}
                <Route element={<AdminGuard />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                        <Route path="/admin/monitoring" element={<MonitoringPage />} />
                        <Route path="/admin/source-discovery" element={<SourceDiscoveryPage />} />
                        <Route path="/admin/ai-settings" element={<AISettingsPage />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Suspense>
    );
}
