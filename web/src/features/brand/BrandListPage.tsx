import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useBrands, useCreateBrand } from '@/hooks/useBrands';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Brand } from '@/types';

const schema = z.object({
    name: z.string().min(1, 'Tên brand là bắt buộc'),
    websiteUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    industry: z.string().optional(),
    timezone: z.string().optional(),
    defaultLanguage: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function BrandListPage() {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const wid = Number(workspaceId);
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const { data: brands, isLoading } = useBrands(wid);
    const createMutation = useCreateBrand(wid);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const onSubmit = async (data: FormData) => {
        await createMutation.mutateAsync(data);
        reset();
        setShowModal(false);
    };

    return (
        <div className="max-w-4xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="font-['Outfit',sans-serif] text-2xl font-semibold text-[var(--color-text)]">
                        Brands
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Quản lý các thương hiệu trong workspace
                    </p>
                </div>
                <Button onClick={() => setShowModal(true)}>+ Thêm Brand</Button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="card" />
                    ))}
                </div>
            ) : !brands?.length ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
                    <div className="mb-4 text-5xl">🎯</div>
                    <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-medium text-[var(--color-text)]">
                        Chưa có Brand nào
                    </h3>
                    <p className="mb-6 text-sm text-[var(--color-text-muted)]">
                        Thêm brand đầu tiên để bắt đầu tạo nội dung
                    </p>
                    <Button onClick={() => setShowModal(true)}>Thêm Brand mới</Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {brands.map((brand: Brand) => (
                        <button
                            key={brand.id}
                            onClick={() => navigate(`/b/${brand.id}/strategy`)}
                            className="glass rounded-xl p-5 text-left transition-all hover:border-[#4FACFE]/30 hover:shadow-lg"
                        >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#00F2FE]/20 to-[#4FACFE]/20 text-xl">
                                🎯
                            </div>
                            <h3 className="font-medium text-[var(--color-text)]">{brand.name}</h3>
                            {brand.websiteUrl && (
                                <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                                    {brand.websiteUrl}
                                </p>
                            )}
                            <span
                                className={`mt-3 inline-block rounded-full px-2 py-0.5 text-xs ${brand.status === 'ACTIVE'
                                        ? 'bg-green-500/10 text-green-400'
                                        : brand.status === 'PAUSED'
                                            ? 'bg-yellow-500/10 text-yellow-400'
                                            : 'bg-white/5 text-[var(--color-text-muted)]'
                                    }`}
                            >
                                {brand.status}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Thêm Brand mới"
                confirmLabel="Tạo"
                onConfirm={handleSubmit(onSubmit)}
                confirmLoading={createMutation.isPending}
            >
                <div className="space-y-4">
                    <Input label="Tên Brand" error={errors.name?.message} {...register('name')} />
                    <Input label="Website URL" error={errors.websiteUrl?.message} {...register('websiteUrl')} />
                    <Input label="Ngành nghề" {...register('industry')} />
                    <Input label="Timezone (vd: Asia/Ho_Chi_Minh)" {...register('timezone')} />
                    <Input label="Ngôn ngữ mặc định (vd: vi)" {...register('defaultLanguage')} />
                </div>
            </Modal>
        </div>
    );
}
