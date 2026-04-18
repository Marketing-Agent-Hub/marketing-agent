import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';
import JsonViewer from '@/components/ui/JsonViewer';
import type { LogEntry } from '@/types';
import { cn } from '@/lib/utils';

const levelColors: Record<string, string> = {
    INFO: 'text-blue-400',
    DEBUG: 'text-white/40',
    WARN: 'text-yellow-400',
    ERROR: 'text-red-400',
    FATAL: 'text-red-600',
    TRACE: 'text-white/20',
};

export default function MonitoringPage() {
    const [search, setSearch] = useState('');
    const [levels, setLevels] = useState<Set<string>>(new Set(['INFO', 'DEBUG', 'WARN', 'ERROR', 'FATAL', 'TRACE']));
    const [autoTail, setAutoTail] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: logs } = useQuery<LogEntry[]>({
        queryKey: ['monitor-logs'],
        queryFn: () => apiClient.get('/api/internal/monitor/logs').then((r) => r.data.data?.logs ?? []),
        refetchInterval: 5000,
    });

    const hasErrors = logs?.some((l) => l.level === 'ERROR' || l.level === 'FATAL');

    const filtered = logs?.filter((log) => {
        if (!levels.has(log.level)) return false;
        if (!search) return true;
        try {
            return new RegExp(search, 'i').test(log.message) || new RegExp(search, 'i').test(log.service ?? '');
        } catch {
            return log.message.toLowerCase().includes(search.toLowerCase());
        }
    });

    useEffect(() => {
        if (autoTail) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [filtered, autoTail]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === '/' && document.activeElement !== searchRef.current) {
                e.preventDefault();
                searchRef.current?.focus();
            } else if (e.key === 'g' || e.key === 'G') {
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const toggleLevel = (level: string) => {
        setLevels((prev) => {
            const next = new Set(prev);
            next.has(level) ? next.delete(level) : next.add(level);
            return next;
        });
    };

    return (
        <div className="flex h-full flex-col font-mono text-xs">
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search (/ to focus, regex ok)"
                    className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#4FACFE]" />

                {(['INFO', 'DEBUG', 'WARN', 'ERROR', 'FATAL'] as const).map((level) => (
                    <button key={level} onClick={() => toggleLevel(level)}
                        className={cn('rounded border px-2 py-1 text-[10px] transition-colors',
                            levels.has(level)
                                ? level === 'ERROR' && hasErrors
                                    ? 'border-red-500 bg-red-500/20 text-red-400'
                                    : 'border-white/20 bg-white/10 text-white'
                                : 'border-white/10 text-white/30')}>
                        {level}
                    </button>
                ))}

                <button onClick={() => setAutoTail(!autoTail)}
                    className={cn('rounded border px-2 py-1 text-[10px] transition-colors',
                        autoTail ? 'border-[#4FACFE] bg-[#4FACFE]/10 text-[#4FACFE]' : 'border-white/10 text-white/30')}>
                    Auto-tail
                </button>
            </div>

            {/* Log table */}
            <div className="flex-1 overflow-y-auto rounded border border-white/10 bg-black/40">
                <table className="w-full">
                    <thead className="sticky top-0 bg-[#111111]">
                        <tr className="border-b border-white/10">
                            <th className="px-3 py-2 text-left text-[10px] text-white/30">TIMESTAMP</th>
                            <th className="px-3 py-2 text-left text-[10px] text-white/30">LEVEL</th>
                            <th className="px-3 py-2 text-left text-[10px] text-white/30">SERVICE</th>
                            <th className="px-3 py-2 text-left text-[10px] text-white/30">MESSAGE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered?.map((log) => (
                            <>
                                <tr key={log.id}
                                    onClick={() => log.metadata && setExpandedId(expandedId === String(log.id) ? null : String(log.id))}
                                    className={cn('border-b border-white/5 transition-colors',
                                        log.metadata ? 'cursor-pointer hover:bg-white/5' : '')}>
                                    <td className="px-3 py-1.5 text-white/40 whitespace-nowrap">
                                        {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 23)}
                                    </td>
                                    <td className={cn('px-3 py-1.5 font-bold', levelColors[log.level] ?? 'text-white/60')}>{log.level}</td>
                                    <td className="px-3 py-1.5 text-[#4FACFE]">{log.service ?? '—'}</td>
                                    <td className="px-3 py-1.5 text-white/80">{log.message}</td>
                                </tr>
                                {expandedId === String(log.id) && log.metadata && (
                                    <tr key={`${log.id}-payload`}>
                                        <td colSpan={4} className="px-3 py-2">
                                            <JsonViewer data={log.metadata} />
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
                <div ref={bottomRef} />
            </div>

            <p className="mt-2 text-[10px] text-white/20">
                <kbd className="rounded border border-white/10 px-1">/</kbd> focus search ·{' '}
                <kbd className="rounded border border-white/10 px-1">G</kbd> scroll to bottom
            </p>
        </div>
    );
}
