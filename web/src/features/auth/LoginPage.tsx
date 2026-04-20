import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const schema = z.object({
    email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;


export default function LoginPage() {
    const [magicSent, setMagicSent] = useState(false);
    const location = useLocation();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    /**
     * Google OAuth â€” full redirect flow (no popup).
     * Saves the intent URL in sessionStorage so the callback page
     * can redirect back after exchanging the token.
     */
    const handleGoogleLogin = () => {
        if (!GOOGLE_CLIENT_ID) {
            toast.error('Server Busy');
            return;
        }
        // Persist intent URL across the redirect
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/workspaces';
        sessionStorage.setItem('auth_redirect', from);

        const redirectUri = `${window.location.origin}/auth/callback`;
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            redirect_uri: redirectUri,
            response_type: 'token id_token',
            scope: 'openid email profile',
            nonce: Math.random().toString(36).slice(2),
        });
        window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    };

    const onSubmit = async (data: FormData) => {
        try {
            await apiClient.post('/api/accounts/auth/magic-link/request', { email: data.email });
            setMagicSent(true);
            toast.success('Check your mail');
        } catch {
            // error handled by interceptor
        }
    };

    return (
        <div className="flex h-screen bg-[var(--color-bg)]">
            {/* Right panel â€” 45% */}
            <div className="flex w-full flex-col items-center justify-center px-8 lg:w-[45%]">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">
                            Login
                        </h2>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Welcome</p>
                    </div>

                    {magicSent ? (
                        <div className="glass rounded-xl p-6 text-center">
                            <div className="mb-3 text-3xl">ðŸ“¬</div>
                            <p className="text-sm text-[var(--color-text)]">
                                Check your mail to login
                            </p>
                            <button
                                onClick={() => setMagicSent(false)}
                                className="mt-4 text-xs text-[#4FACFE] hover:underline"
                            >
                                Resend
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <Input
                                label="Email"
                                type="email"
                                error={errors.email?.message}
                                {...register('email')}
                            />

                            <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
                                âœ‰ï¸ Login with email
                            </Button>

                            <div className="relative flex items-center gap-3">
                                <div className="flex-1 border-t border-[var(--color-border)]" />
                                <span className="text-xs text-[var(--color-text-muted)]">or</span>
                                <div className="flex-1 border-t border-[var(--color-border)]" />
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleGoogleLogin}
                                className="w-full border border-[var(--color-border)]"
                            >
                                ðŸ”µ Login with Google
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
