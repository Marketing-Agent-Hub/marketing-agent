'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import {
    useCreateOnboardingSession,
    useOnboardingSession,
    useAddMessage,
    useCompleteSession,
} from '@/hooks/use-onboarding';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function OnboardingPage({ params }: { params: Promise<{ brandId: string }> }) {
    const { brandId } = use(params);
    const id = parseInt(brandId);
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const createSession = useCreateOnboardingSession(id);
    const { data: session, isLoading } = useOnboardingSession(id, sessionId ?? undefined);
    const addMessage = useAddMessage(id, sessionId ?? 0);
    const completeSession = useCompleteSession(id, sessionId ?? 0);

    const handleStart = async () => {
        const s = await createSession.mutateAsync();
        setSessionId(s.id);
    };

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !sessionId) return;
        addMessage.mutate({ role: 'user', content: message.trim() });
        setMessage('');
    };

    const handleComplete = async () => {
        await completeSession.mutateAsync();
        router.push(`/app/brands/${id}/strategy`);
    };

    if (!sessionId) {
        return (
            <div className="px-8 py-12 max-w-2xl">
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Brand onboarding</h1>
                <p className="text-sm text-zinc-500 mb-8">
                    The AI will ask you questions to understand your brand, audience, and goals.
                    This helps generate better content.
                </p>
                <Button onClick={handleStart} loading={createSession.isPending}>
                    Start brand interview
                </Button>
            </div>
        );
    }

    if (isLoading) return <div className="p-8"><SkeletonCard /></div>;

    const transcript = session?.transcript ?? [];

    return (
        <div className="px-8 py-8 max-w-2xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-zinc-900">Brand interview</h1>
                {session?.status === 'IN_PROGRESS' && (
                    <Button variant="secondary" size="sm" onClick={handleComplete} loading={completeSession.isPending}>
                        Complete interview
                    </Button>
                )}
                {session?.status === 'COMPLETED' && (
                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                )}
            </div>

            {/* Transcript */}
            <div className="flex-1 space-y-4 mb-6 overflow-y-auto max-h-[60vh]">
                {transcript.length === 0 && (
                    <p className="text-sm text-zinc-400">The interview will begin shortly...</p>
                )}
                {transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-sm rounded-xl px-4 py-2.5 text-sm ${msg.role === 'user'
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-800'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            {/* Input */}
            {session?.status === 'IN_PROGRESS' && (
                <form onSubmit={handleSend} className="flex gap-2">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your response..."
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    />
                    <Button type="submit" size="sm" loading={addMessage.isPending} disabled={!message.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            )}
        </div>
    );
}
