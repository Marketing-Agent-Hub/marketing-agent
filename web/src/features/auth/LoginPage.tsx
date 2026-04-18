import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const schema = z.object({
    email: z.string().email('Email không hợp lệ'),
});
type FormData = z.infer<typeof schema>;

const benefits = [
    { icon: '🤖', title: 'AI tự động thu thập tin tức', desc: 'Hàng nghìn nguồn RSS được theo dõi 24/7' },
    { icon: '✍️', title: 'Tạo nội dung thông minh', desc: 'AI viết bài phù hợp với giọng điệu thương hiệu' },
    { icon: '📅', title: 'Lên lịch đăng bài tự động', desc: 'Chiến lược 30 ngày được tối ưu hóa' },
    { icon: '📊', title: 'Phân tích hiệu quả', desc: 'Dashboard theo dõi toàn bộ pipeline' },
];

export default function LoginPage() {
    const [magicSent, setMagicSent] = useState(false);
    const [carouselIdx, setCarouselIdx] = useState(0);
    const location = useLocation();

    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    /**
     * Google OAuth — full redirect flow (no popup).
     * Saves the intent URL in sessionStorage so the callback page
     * can redirect back after exchanging the token.
     */
    const handleGoogleLogin = () => {
        if (!GOOGLE_CLIENT_ID) {
            toast.error('Google OAuth chưa được cấu hình (thiếu VITE_GOOGLE_CLIENT_ID)');
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
            toast.success('Magic link đã được gửi! Kiểm tra email của bạn.');
        } catch {
            // error handled by interceptor
        }
    };

    return (
        <div className="flex h-screen bg-[var(--color-bg)]">
            {/* Left panel — 55% */}
            <div
                className="relative hidden w-[55%] overflow-hidden lg:flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1b3e 50%, #0a0a1a 100%)' }}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-20 blur-3xl animate-pulse"
                        style={{ background: 'radial-gradient(circle, #00F2FE, transparent)' }}
                    />
                    <div
                        className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full opacity-20 blur-3xl animate-pulse"
                        style={{ background: 'radial-gradient(circle, #4FACFE, transparent)', animationDelay: '1s' }}
                    />
                </div>

                <div className="relative z-10 max-w-md px-12 text-center">
                    <h1
                        className="mb-2 font-['Outfit',sans-serif] text-4xl font-bold"
                        style={{
                            background: 'linear-gradient(to right, #00F2FE, #4FACFE)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        OC News Bot
                    </h1>
                    <p className="mb-12 text-sm text-white/50">AI-powered content automation</p>

                    <div className="glass rounded-2xl p-8 text-left transition-all duration-500">
                        <div className="mb-4 text-4xl">{benefits[carouselIdx].icon}</div>
                        <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-semibold text-white">
                            {benefits[carouselIdx].title}
                        </h3>
                        <p className="text-sm text-white/60">{benefits[carouselIdx].desc}</p>
                    </div>

                    <div className="mt-6 flex justify-center gap-2">
                        {benefits.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCarouselIdx(i)}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-300',
                                    i === carouselIdx ? 'w-6 bg-[#4FACFE]' : 'w-1.5 bg-white/20',
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel — 45% */}
            <div className="flex w-full flex-col items-center justify-center px-8 lg:w-[45%]">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h2 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">
                            Đăng nhập
                        </h2>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Chào mừng trở lại</p>
                    </div>

                    {magicSent ? (
                        <div className="glass rounded-xl p-6 text-center">
                            <div className="mb-3 text-3xl">📬</div>
                            <p className="text-sm text-[var(--color-text)]">
                                Kiểm tra email của bạn để đăng nhập qua magic link.
                            </p>
                            <button
                                onClick={() => setMagicSent(false)}
                                className="mt-4 text-xs text-[#4FACFE] hover:underline"
                            >
                                Gửi lại
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
                                ✉️ Gửi Magic Link
                            </Button>

                            <div className="relative flex items-center gap-3">
                                <div className="flex-1 border-t border-[var(--color-border)]" />
                                <span className="text-xs text-[var(--color-text-muted)]">hoặc</span>
                                <div className="flex-1 border-t border-[var(--color-border)]" />
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleGoogleLogin}
                                className="w-full border border-[var(--color-border)]"
                            >
                                🔵 Đăng nhập với Google
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
