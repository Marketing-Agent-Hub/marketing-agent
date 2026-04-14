import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/api/client';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const schema = z
    .object({
        email: z.string().email('Email không hợp lệ'),
        password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự'),
        confirmPassword: z.string(),
    })
    .refine((d) => d.password === d.confirmPassword, {
        message: 'Mật khẩu không khớp',
        path: ['confirmPassword'],
    });
type FormData = z.infer<typeof schema>;

function getStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
        { label: '', color: 'bg-white/10' },
        { label: 'Yếu', color: 'bg-red-500' },
        { label: 'Trung bình', color: 'bg-yellow-500' },
        { label: 'Tốt', color: 'bg-blue-500' },
        { label: 'Mạnh', color: 'bg-green-500' },
    ];
    return { score, ...levels[score] };
}

export default function RegisterPage() {
    const [password, setPassword] = useState('');
    const { setToken } = useAuthStore();
    const navigate = useNavigate();
    const strength = getStrength(password);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        const res = await apiClient.post<{ token: string }>('/api/v2/accounts/auth/register', {
            email: data.email,
            password: data.password,
        });
        setToken(res.data.token);
        navigate('/workspaces', { replace: true });
    };

    return (
        <div className="flex h-screen items-center justify-center bg-[var(--color-bg)] px-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">
                        Tạo tài khoản
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">Bắt đầu tự động hóa nội dung</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />

                    <div>
                        <Input
                            label="Mật khẩu"
                            type="password"
                            error={errors.password?.message}
                            {...register('password', { onChange: (e) => setPassword(e.target.value) })}
                        />
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                'h-1 flex-1 rounded-full transition-all duration-300',
                                                i <= strength.score ? strength.color : 'bg-white/10'
                                            )}
                                        />
                                    ))}
                                </div>
                                {strength.label && (
                                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                                        Độ mạnh: <span className="text-[var(--color-text)]">{strength.label}</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <Input
                        label="Xác nhận mật khẩu"
                        type="password"
                        error={errors.confirmPassword?.message}
                        {...register('confirmPassword')}
                    />

                    <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
                        Đăng ký
                    </Button>

                    <p className="text-center text-xs text-[var(--color-text-muted)]">
                        Đã có tài khoản?{' '}
                        <Link to="/login" className="text-[#4FACFE] hover:underline">
                            Đăng nhập
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
