import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';

// ── Types ──────────────────────────────────────────────────────────────────

interface Source {
    id: number;
    name: string;
    rssUrl?: string | null;
    siteUrl?: string | null;
    lang: 'VI' | 'EN' | 'MIXED';
    type: string;
    trustScore: number;
    enabled: boolean;
    topicTags: string[];
    denyKeywords: string[];
    fetchIntervalMinutes: number;
    notes?: string | null;
    lastValidatedAt?: string | null;
    lastValidationStatus?: string | null;
    lastFetchedAt?: string | null;
    lastFetchStatus?: string | null;
    itemsCount: number;
    createdAt: string;
}

interface SourcesResponse {
    sources: Source[];
    total: number;
    limit: number;
    offset: number;
}

// ── Form schema ────────────────────────────────────────────────────────────

const sourceSchema = z.object({
    name: z.string().min(1, 'Tên là bắt buộc'),
    rssUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    siteUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    lang: z.enum(['VI', 'EN', 'MIXED']),
    type: z.enum(['RSS', 'WEB_SCRAPER', 'YOUTUBE', 'SOCIAL_MEDIA', 'CUSTOM_API']),
    trustScore: z.coerce.number().int().min(0).max(100),
    enabled: z.boolean(),
    fetchIntervalMinutes: z.coerce.number().int().min(5).max(1440),
    topicTagsRaw: z.string(), // comma-separated
    denyKeywordsRaw: z.string(), // comma-separated
    notes: z.string().optional(),
});
type SourceFormData = z.infer<typeof sourceSchema>;

function toTagArray(raw: string): string[] {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function toTagString(arr: string[]): string {
    return arr.join(', ');
}

// ── Hooks ──────────────────────────────────────────────────────────────────

function useSources(search: string, page: number) {
    const limit = 20;
    const offset = (page - 1) * limit;
    return useQuery<SourcesResponse>({
        queryKey: ['admin-sources', search, page],
        queryFn: () =>
            apiClient
                .get('/api/internal/sources', { params: { search: search || undefined, limit, offset } })
                .then((r) => r.data.data),
    });
}

function useCreateSource() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiClient.post('/api/internal/sources', data).then((r) => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sources'] }); toast.success('Đã tạo source'); },
    });
}

function useUpdateSource(id: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: object) => apiClient.patch(`/api/internal/sources/${id}`, data).then((r) => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sources'] }); toast.success('Đã cập nhật source'); },
    });
}

function useDeleteSource() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => apiClient.delete(`/api/internal/sources/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-sources'] }); toast.success('Đã xóa source'); },
    });
}

function useValidateRSS() {
    return useMutation({
        mutationFn: (url: string) =>
            apiClient.post('/api/internal/sources/validate', { url }).then((r) => r.data),
    });
}

// ── Source Form ────────────────────────────────────────────────────────────

function SourceForm({
    defaultValues,
    onSubmit,
    loading,
}: {
    defaultValues?: Partial<SourceFormData>;
    onSubmit: (data: SourceFormData) => void;
    loading: boolean;
}) {
    const { register, handleSubmit, watch, formState: { errors } } = useForm<SourceFormData>({
        resolver: zodResolver(sourceSchema) as any,
        defaultValues: {
            lang: 'MIXED',
            type: 'RSS',
            trustScore: 70,
            enabled: false,
            fetchIntervalMinutes: 60,
            topicTagsRaw: '',
            denyKeywordsRaw: '',
            ...defaultValues,
        },
    });

    const validateMutation = useValidateRSS();
    const rssUrl = watch('rssUrl');

    const handleValidate = async () => {
        if (!rssUrl) return;
        try {
            const result = await validateMutation.mutateAsync(rssUrl);
            if (result.ok) toast.success('Feed hợp lệ ✓');
            else toast.error(`Feed không hợp lệ: ${result.error ?? 'unknown'}`);
        } catch { /* handled by interceptor */ }
    };

    const field = (label: string, name: keyof SourceFormData, type = 'text', placeholder = '') => (
        <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">{label}</label>
            <input
                type={type}
                placeholder={placeholder}
                {...register(name)}
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors"
            />
            {errors[name] && <p className="mt-0.5 text-[10px] text-red-500">{errors[name]?.message as string}</p>}
        </div>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-3 font-mono text-xs">
            <div className="grid grid-cols-2 gap-3">
                {field('Tên nguồn *', 'name', 'text', 'VD: VnExpress Tech')}
                <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-white/40">Loại</label>
                    <select {...register('type')} className="w-full rounded border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-[#4FACFE]">
                        {['RSS', 'WEB_SCRAPER', 'YOUTUBE', 'SOCIAL_MEDIA', 'CUSTOM_API'].map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">RSS URL</label>
                <div className="flex gap-2">
                    <input
                        type="url"
                        placeholder="https://example.com/feed"
                        {...register('rssUrl')}
                        className="flex-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors"
                    />
                    <button
                        type="button"
                        onClick={handleValidate}
                        disabled={!rssUrl || validateMutation.isPending}
                        className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[10px] text-[var(--color-text)] opacity-60 hover:bg-[var(--color-bg-card)] disabled:opacity-30 transition-colors"
                    >
                        {validateMutation.isPending ? '...' : 'Validate'}
                    </button>
                </div>
                {errors.rssUrl && <p className="mt-0.5 text-[10px] text-red-500">{errors.rssUrl.message}</p>}
            </div>

            {field('Site URL', 'siteUrl', 'url', 'https://example.com')}

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">Ngôn ngữ</label>
                    <select {...register('lang')} className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text)] outline-none focus:border-[#4FACFE]">
                        <option value="MIXED">MIXED</option>
                        <option value="VI">VI</option>
                        <option value="EN">EN</option>
                    </select>
                </div>
                {field('Trust Score (0-100)', 'trustScore', 'number')}
                {field('Fetch Interval (phút)', 'fetchIntervalMinutes', 'number')}
            </div>

            {field('Topic Tags (phân cách bằng dấu phẩy)', 'topicTagsRaw', 'text', 'tech, ai, startup')}
            {field('Deny Keywords (phân cách bằng dấu phẩy)', 'denyKeywordsRaw', 'text', 'spam, ads')}
            {field('Ghi chú', 'notes', 'text', 'Ghi chú nội bộ...')}

            <div className="flex items-center gap-2">
                <input type="checkbox" id="enabled" {...register('enabled')} className="rounded" />
                <label htmlFor="enabled" className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">Kích hoạt ngay</label>
            </div>

            <Button type="submit" loading={loading} className="w-full text-xs">
                Lưu
            </Button>
        </form>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AdminSourcesPage() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [editSource, setEditSource] = useState<Source | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Source | null>(null);
    const [showImport, setShowImport] = useState(false);

    const { data, isLoading } = useSources(search, page);
    const createMutation = useCreateSource();
    const deleteMutation = useDeleteSource();

    const sources = data?.sources ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    const handleCreate = async (form: SourceFormData) => {
        const { topicTagsRaw, denyKeywordsRaw, ...rest } = form;
        await createMutation.mutateAsync({
            ...rest,
            rssUrl: rest.rssUrl || undefined,
            siteUrl: rest.siteUrl || undefined,
            topicTags: toTagArray(topicTagsRaw),
            denyKeywords: toTagArray(denyKeywordsRaw),
        });
        setShowCreate(false);
    };

    // ── Export ──────────────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const res = await apiClient.get('/api/internal/sources/export');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sources-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Đã tải xuống sources.json');
        } catch { /* handled by interceptor */ }
    };

    return (
        <div className="font-mono text-xs">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-bold text-[var(--color-text)]">Master Sources</h1>
                    <p className="text-[10px] text-[var(--color-text-muted)] opacity-50">{total} nguồn · trang {page}/{totalPages || 1}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[10px] text-[var(--color-text)] opacity-60 hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text)] transition-colors"
                    >
                        ↓ Export JSON
                    </button>
                    <button
                        onClick={() => setShowImport(true)}
                        className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[10px] text-[var(--color-text)] opacity-60 hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text)] transition-colors"
                    >
                        ↑ Import JSON
                    </button>
                    <Button onClick={() => setShowCreate(true)} className="text-xs">
                        + Thêm nguồn
                    </Button>
                </div>
            </div>

            {/* Search */}
            <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Tìm kiếm theo tên, URL..."
                className="mb-4 w-full rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] px-3 py-2 text-xs text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] opacity-80 focus:border-[#4FACFE]"
            />

            {/* Table */}
            <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] overflow-x-auto transition-colors">
                <table className="w-full">
                    <thead className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                        <tr>
                            {['Tên', 'URL', 'Loại', 'Lang', 'Score', 'Items', 'Status', ''].map((h) => (
                                <th key={h} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="border-b border-white/5">
                                    <td colSpan={8} className="px-3 py-2">
                                        <Skeleton variant="text" />
                                    </td>
                                </tr>
                            ))
                        ) : sources.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-3 py-8 text-center text-[var(--color-text-muted)] opacity-50">
                                    Chưa có nguồn nào
                                </td>
                            </tr>
                        ) : (
                            sources.map((src) => (
                                <tr key={src.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                                    <td className="px-3 py-2 text-[var(--color-text)] font-semibold max-w-[160px] truncate">{src.name}</td>
                                    <td className="px-3 py-2 text-[var(--color-text-muted)] opacity-70 max-w-[200px] truncate">
                                        <a href={src.rssUrl ?? src.siteUrl ?? '#'} target="_blank" rel="noopener noreferrer" className="hover:text-[#4FACFE] transition-colors">
                                            {src.rssUrl ?? src.siteUrl ?? '—'}
                                        </a>
                                    </td>
                                    <td className="px-3 py-2 text-[var(--color-text-muted)] opacity-60">{src.type}</td>
                                    <td className="px-3 py-2 text-[var(--color-text-muted)] opacity-60">{src.lang}</td>
                                    <td className="px-3 py-2">
                                        <span className={`font-bold ${src.trustScore >= 70 ? 'text-green-500' : src.trustScore >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {src.trustScore}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-[var(--color-text-muted)] opacity-60">{src.itemsCount}</td>
                                    <td className="px-3 py-2">
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] ${src.enabled ? 'bg-green-500/20 text-green-600' : 'bg-[var(--color-border)] text-[var(--color-text-muted)] opacity-50'}`}>
                                            {src.enabled ? 'ON' : 'OFF'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setEditSource(src)}
                                                className="text-[#4FACFE] hover:underline"
                                            >
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(src)}
                                                className="text-red-400 hover:underline"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] disabled:opacity-30">
                        ← Trước
                    </button>
                    <span className="text-[10px] text-[var(--color-text-muted)] opacity-50">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded border border-[var(--color-border)] px-3 py-1 text-[10px] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] disabled:opacity-30">
                        Sau →
                    </button>
                </div>
            )}

            {/* Create Modal */}
            <Modal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Thêm nguồn mới"
                confirmLabel={null}
            >
                <SourceForm
                    onSubmit={handleCreate}
                    loading={createMutation.isPending}
                />
            </Modal>

            {/* Edit Modal */}
            {editSource && (
                <EditSourceModal
                    source={editSource}
                    onClose={() => setEditSource(null)}
                />
            )}

            {/* Delete Confirm */}
            <Modal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Xóa nguồn"
                variant="destructive"
                confirmLabel="Xóa"
                onConfirm={async () => {
                    if (deleteTarget) {
                        await deleteMutation.mutateAsync(deleteTarget.id);
                        setDeleteTarget(null);
                    }
                }}
                confirmLoading={deleteMutation.isPending}
            >
                <p className="text-xs text-[var(--color-text)] opacity-80">
                    Bạn có chắc muốn xóa nguồn <strong className="text-[var(--color-text)]">{deleteTarget?.name}</strong>?
                    Hành động này không thể hoàn tác.
                </p>
            </Modal>

            {/* Import Modal */}
            {showImport && (
                <ImportSourcesModal onClose={() => setShowImport(false)} />
            )}
        </div >
    );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────

function EditSourceModal({ source, onClose }: { source: Source; onClose: () => void }) {
    const updateMutation = useUpdateSource(source.id);

    const handleUpdate = async (form: SourceFormData) => {
        const { topicTagsRaw, denyKeywordsRaw, ...rest } = form;
        await updateMutation.mutateAsync({
            ...rest,
            rssUrl: rest.rssUrl || undefined,
            siteUrl: rest.siteUrl || undefined,
            topicTags: toTagArray(topicTagsRaw),
            denyKeywords: toTagArray(denyKeywordsRaw),
        });
        onClose();
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Sửa: ${source.name}`}
            confirmLabel={null}
        >
            <SourceForm
                defaultValues={{
                    name: source.name,
                    rssUrl: source.rssUrl ?? '',
                    siteUrl: source.siteUrl ?? '',
                    lang: source.lang,
                    type: source.type as SourceFormData['type'],
                    trustScore: source.trustScore,
                    enabled: source.enabled,
                    fetchIntervalMinutes: source.fetchIntervalMinutes,
                    topicTagsRaw: toTagString(source.topicTags),
                    denyKeywordsRaw: toTagString(source.denyKeywords),
                    notes: source.notes ?? '',
                }}
                onSubmit={handleUpdate}
                loading={updateMutation.isPending}
            />
        </Modal>
    );
}

// ── Import Modal ───────────────────────────────────────────────────────────

/**
 * Accepts either:
 * - A JSON array of source objects: [{name, rssUrl, ...}, ...]
 * - A single source object: {name, rssUrl, ...}
 * - The export format: {sources: [...]} or {data: {sources: [...]}}
 */
function parseImportJson(raw: string): object[] {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.sources && Array.isArray(parsed.sources)) return parsed.sources;
    if (parsed?.data?.sources && Array.isArray(parsed.data.sources)) return parsed.data.sources;
    if (typeof parsed === 'object' && parsed !== null) return [parsed];
    throw new Error('Định dạng JSON không hợp lệ. Cần array hoặc object có field "sources".');
}

function ImportSourcesModal({ onClose }: { onClose: () => void }) {
    const [jsonText, setJsonText] = useState('');
    const [preview, setPreview] = useState<object[] | null>(null);
    const [parseError, setParseError] = useState('');
    const [importing, setImporting] = useState(false);
    const [results, setResults] = useState<{ ok: number; failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const qc = useQueryClient();

    const handleParse = () => {
        setParseError('');
        try {
            const items = parseImportJson(jsonText);
            setPreview(items);
        } catch (e: any) {
            setParseError(e.message ?? 'JSON không hợp lệ');
            setPreview(null);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            setJsonText(text);
            setParseError('');
            try {
                setPreview(parseImportJson(text));
            } catch (err: any) {
                setParseError(err.message);
                setPreview(null);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!preview?.length) return;
        setImporting(true);
        let ok = 0;
        let failed = 0;

        for (const item of preview) {
            try {
                await apiClient.post('/api/internal/sources', item);
                ok++;
            } catch {
                failed++;
            }
        }

        setImporting(false);
        setResults({ ok, failed });
        qc.invalidateQueries({ queryKey: ['admin-sources'] });
        if (ok > 0) toast.success(`Đã import ${ok} nguồn thành công`);
        if (failed > 0) toast.error(`${failed} nguồn bị lỗi (trùng URL hoặc dữ liệu không hợp lệ)`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="glass relative w-full max-w-2xl rounded-xl p-6 shadow-2xl font-mono text-xs">
                <h2 className="mb-4 text-sm font-bold text-[var(--color-text)]">Import Sources từ JSON</h2>

                {results ? (
                    <div className="space-y-4">
                        <div className="rounded border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 text-center">
                            <p className="text-green-500 font-bold">✓ {results.ok} nguồn đã import</p>
                            {results.failed > 0 && <p className="text-red-500 font-bold">✗ {results.failed} nguồn thất bại</p>}
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={onClose} variant="ghost" className="text-xs">Đóng</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* File upload */}
                        <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">
                                Chọn file .json
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,application/json"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="rounded border border-[var(--color-border)] px-3 py-1.5 text-[10px] text-[var(--color-text)] opacity-60 hover:bg-[var(--color-bg-card)] transition-colors"
                                >
                                    📂 Chọn file
                                </button>
                                <span className="flex items-center text-[10px] text-[var(--color-text-muted)] opacity-40">
                                    hoặc paste JSON bên dưới
                                </span>
                            </div>
                        </div>

                        {/* JSON textarea */}
                        <div>
                            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] opacity-50">
                                Paste JSON
                            </label>
                            <textarea
                                value={jsonText}
                                onChange={(e) => { setJsonText(e.target.value); setPreview(null); setParseError(''); }}
                                placeholder={`[\n  { "name": "VnExpress", "rssUrl": "https://vnexpress.net/rss/tin-moi-nhat.rss", "lang": "VI", "trustScore": 80 },\n  ...\n]`}
                                rows={8}
                                className="w-full resize-y rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[11px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-muted)] opacity-40 focus:border-[#4FACFE] transition-colors"
                            />
                            {parseError && <p className="mt-1 text-[10px] text-red-500">{parseError}</p>}
                        </div>

                        {/* Format hint */}
                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-40">
                            Hỗ trợ: array <code className="text-[var(--color-text-muted)]">[{'{...}'}]</code>, object đơn <code className="text-[var(--color-text-muted)]">{'{...}'}</code>, hoặc export format <code className="text-[var(--color-text-muted)]">{'{"sources":[...]}'}</code>
                        </p>

                        {/* Preview */}
                        {preview && (
                            <div className="rounded border border-[#4FACFE]/20 bg-[#4FACFE]/5 p-3">
                                <p className="mb-1 text-[10px] text-[#4FACFE]">
                                    ✓ Đã parse {preview.length} nguồn — sẵn sàng import
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-0.5">
                                    {preview.slice(0, 10).map((item: any, i) => (
                                        <p key={i} className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate">
                                            {i + 1}. {item.name ?? item.rssUrl ?? JSON.stringify(item).slice(0, 60)}
                                        </p>
                                    ))}
                                    {preview.length > 10 && (
                                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-40">... và {preview.length - 10} nguồn khác</p>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                            <Button variant="ghost" onClick={onClose} className="text-xs">Hủy</Button>
                            {!preview ? (
                                <Button onClick={handleParse} disabled={!jsonText.trim()} className="text-xs">
                                    Parse JSON
                                </Button>
                            ) : (
                                <Button onClick={handleImport} loading={importing} className="text-xs">
                                    Import {preview.length} nguồn
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
