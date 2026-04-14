import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const schema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});
type FormData = z.infer<typeof schema>;

const benefits = [
    { icon: '🤖', title: 'AI tự động thu thập tin tức', desc: 'Hàng nghìn nguồn RSS được theo dõi 24/7' },
    { icon: '✍️', title: 'Tạo nội dung thông minh', desc: 'AI viết bài phù hợp với giọng điệu thương hiệu' },
    { icon: '📅', title: 'Lên lịch đăng bài tự động', desc: 'Chiến lược 30 ngày được tối ưu hóa' },
    { icon: '📊', title: 'Phân tích hiệu quả', desc: 'Dashboard theo dõi toàn bộ pipeline' },
];

export default function LoginPage() {
    const [shake, setShake] = useState(false);
    const [magicSent, setMagicSent] = useState(false);
    const [carouselIdx, setCarouselIdx] = useState(0);
    const { setToken } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/workspaces';

    const { register, handleSubmit, formState: { errors, isSubmitting }, getValues } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        try {
            const res = await apiClient.post<{ token: string }>('/api/v2/accounts/auth/login', data);
            setToken(res.data.token);
            const role = useAuthStore.getState().user?.systemRole;
            navigate(role === 'ADMIN' ? '/admin/dashboard' : from, { replace: true });
        } catch {
            setShake(true);
            setTimeout(() => setShake(false), 600);
        }
    };

    const handleMagicLink = async () => {
        const email = getValues('email');
        if (!email) return;
        try {
            await apiClient.post('/api/v2/accounts/auth/magic-link/request', { email });
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
                {/* Animated gradient orbs */}
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

                    {/* Benefit card */}
                    <div className="glass rounded-2xl p-8 text-left transition-all duration-500">
                        <div className="mb-4 text-4xl">{benefits[carouselIdx].icon}</div>
                        <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-semibold text-white">
                            {benefits[carouselIdx].title}
                        </h3>
                        <p className="text-sm text-white/60">{benefits[carouselIdx].desc}</p>
                    </div>

                    {/* Carousel dots */}
                    <div className="mt-6 flex justify-center gap-2">
                        {benefits.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCarouselIdx(i)}
                                className={cn(
                                    'h-1.5 rounded-full transition-all duration-300',
                                    i === carouselIdx ? 'w-6 bg-[#4FACFE]' : 'w-1.5 bg-white/20'
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
                        </div>
                    ) : (
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className={cn('space-y-4', shake && 'animate-[shake_0.5s_ease-in-out]')}
                        >
                            <Input
                                label="Email"
                                type="email"
                                error={errors.email?.message}
                                {...register('email')}
                            />
                            <Input
                                label="Mật khẩu"
                                type="password"
                                error={errors.password?.message}
                                {...register('password')}
                            />

                            <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
                                Đăng nhập
                            </Button>

                            <button
                                type="button"
                                onClick={handleMagicLink}
                                className="w-full rounded-lg border border-[var(--color-border)] py-2 text-sm text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                            >
                                ✉️ Gửi Magic Link
                            </button>

                            <button
                                type="button"
                                className="w-full rounded-lg border border-[var(--color-border)] py-2 text-sm text-[var(--color-text-muted)] hover:bg-white/5 transition-colors"
                            >
                                🔵 Đăng nhập với Google
                            </button>

                            <p className="text-center text-xs text-[var(--color-text-muted)]">
                                Chưa có tài khoản?{' '}
                                <Link to="/register" className="text-[#4FACFE] hover:underline">
                                    Đăng ký
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
        </div>
    );
}
