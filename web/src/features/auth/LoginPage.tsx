import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const { setToken } = useAuthStore();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Placeholder auth logic
        setToken('mock_token');
        navigate('/workspaces');
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="glass w-full max-w-md rounded-2xl p-8 shadow-2xl">
                <div className="mb-8 text-center">
                    <div className="mb-4 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00F2FE] to-[#4FACFE] text-2xl text-white shadow-lg">
                            M
                        </div>
                    </div>
                    <h1 className="font-['Outfit',sans-serif] text-2xl font-bold text-[var(--color-text)]">
                        Welcome Back
                    </h1>
                    <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                        Login to access your Marketing Agent
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        required
                    />
                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />
                    
                    <div className="pt-2">
                        <Button type="submit" className="w-full">
                            Login
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
