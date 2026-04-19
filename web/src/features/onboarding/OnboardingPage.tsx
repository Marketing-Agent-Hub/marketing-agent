import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { usePolling } from '@/hooks/usePolling';
import type { Brand } from '@/types';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    typing?: boolean;
}

function useTypewriter(text: string | undefined, active: boolean, intervalMs = 20) {
    const safeText = text ?? '';
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!active) { setDisplayed(safeText); setDone(true); return; }
        setDisplayed('');
        setDone(false);
        let i = 0;
        const timer = setInterval(() => {
            i++;
            setDisplayed(safeText.slice(0, i));
            if (i >= safeText.length) { clearInterval(timer); setDone(true); }
        }, intervalMs);
        return () => clearInterval(timer);
    }, [safeText, active, intervalMs]);

    return { displayed, done };
}

function TypewriterMessage({ content }: { content: string | undefined }) {
    const { displayed } = useTypewriter(content, true);
    return <span>{displayed}</span>;
}

export default function OnboardingPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const navigate = useNavigate();
    const bid = Number(brandId);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [polling, setPolling] = useState(false);
    const [timedOut, setTimedOut] = useState(false);
    const [profileFound, setProfileFound] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Create session on mount
    useEffect(() => {
        apiClient
            .post<{ id: string; messages?: Array<{ role: string; content: string }> }>(
                `/api/brands/${bid}/onboarding/sessions`
            )
            .then((res) => {
                setSessionId(res.data.id);
                if (res.data.messages?.length) {
                    setMessages(
                        res.data.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
                    );
                } else {
                    setMessages([{ role: 'assistant', content: 'Xin chào! Hãy cho tôi biết về thương hiệu của bạn. Name thương hiệu là gì?' }]);
                }
            })
            .catch(() => toast.error('Không thể tạo phiên onboarding'));
    }, [bid]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, generating]);

    // Polling for BrandProfile
    usePolling<Brand>({
        queryKey: ['brand-polling', bid],
        queryFn: () => apiClient.get(`/api/brands/${bid}`).then((r) => r.data),
        shouldStop: (data) => !!data.profile,
        enabled: polling,
        intervalMs: 3000,
        timeoutMs: 120_000,
        onStop: (data) => {
            if (data.profile) {
                setProfileFound(true);
                setPolling(false);
                toast.success('Brand Profile đã được tạo thành công! 🎉');
                setTimeout(() => navigate(`/b/${bid}/strategy`), 2000);
            }
        },
        onTimeout: () => {
            setPolling(false);
            setTimedOut(true);
        },
    });

    const sendMessage = useCallback(async () => {
        if (!input.trim() || !sessionId || generating) return;
        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
        setGenerating(true);

        try {
            const res = await apiClient.post<{ role: string; content: string }>(
                `/api/brands/${bid}/onboarding/sessions/${sessionId}/messages`,
                { role: 'user', content: userMsg }
            );
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.content }]);
        } catch {
            // error handled by interceptor
        } finally {
            setGenerating(false);
        }
    }, [input, sessionId, generating, bid]);

    const handleComplete = async () => {
        if (!sessionId) return;
        setCompleting(true);
        try {
            await apiClient.post(`/api/brands/${bid}/onboarding/sessions/${sessionId}/complete`);
            toast.info('Đang xử lý Brand Profile... Bạn có thể tiếp tục làm việc.');
            setPolling(true);
        } catch {
            // error handled by interceptor
        } finally {
            setCompleting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    return (
        <div className="flex h-full flex-col bg-[var(--color-bg)]">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="mx-auto max-w-2xl space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] text-black'
                                : 'glass text-[var(--color-text)]'
                                }`}>
                                {msg.role === 'assistant' && i === messages.length - 1 && !generating ? (
                                    <TypewriterMessage content={msg.content} />
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    ))}

                    {generating && (
                        <div className="flex justify-start">
                            <div className="glass rounded-2xl px-4 py-3 text-sm text-[var(--color-text-muted)]">
                                <span className="animate-pulse">Generating...</span>
                            </div>
                        </div>
                    )}

                    {profileFound && (
                        <div className="glass rounded-2xl border-[#4FACFE]/30 p-4 text-center animate-pulse">
                            <div className="text-2xl">✨</div>
                            <p className="mt-2 text-sm text-[#4FACFE]">Brand Profile đã được tạo! Đang chuyển hướng...</p>
                        </div>
                    )}

                    {timedOut && (
                        <div className="glass rounded-2xl border-red-500/30 p-4 text-center">
                            <p className="mb-3 text-sm text-red-400">Quá thời gian chờ. Vui lòng thử lại.</p>
                            <Button variant="ghost" onClick={() => { setTimedOut(false); setPolling(true); }}>
                                Thử lại
                            </Button>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Floating input area */}
            <div className="border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-4">
                <div className="mx-auto max-w-2xl">
                    <div className="flex gap-3">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn... (Enter để gửi)"
                            rows={2}
                            className="flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] focus:border-[#4FACFE] transition-colors"
                        />
                        <div className="flex flex-col gap-2">
                            <Button onClick={sendMessage} loading={generating} disabled={!input.trim()}>
                                Gửi
                            </Button>
                            <Button variant="ghost" onClick={handleComplete} loading={completing} disabled={polling}>
                                Save & Phân tích
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
