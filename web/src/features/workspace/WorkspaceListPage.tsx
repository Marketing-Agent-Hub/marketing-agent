import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWorkspaces, useCreateWorkspace } from '@/hooks/useWorkspaces';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import type { Workspace } from '@/types';

const schema = z.object({
    name: z.string().min(1, 'Workspace name is required'),
});
type FormData = z.infer<typeof schema>;

export default function WorkspaceListPage() {
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();
    const { data: workspaces, isLoading } = useWorkspaces();
    const createMutation = useCreateWorkspace();

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
                        Workspaces
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">Manage your workspaces</p>
                </div>
                <Button onClick={() => setShowModal(true)}>+ Create Workspace</Button>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="card" />
                    ))}
                </div>
            ) : !workspaces?.length ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-20 text-center">
                    <div className="mb-4 text-5xl">🏢</div>
                    <h3 className="mb-2 font-['Outfit',sans-serif] text-lg font-medium text-[var(--color-text)]">
                        No Workspaces yet
                    </h3>
                    <p className="mb-6 text-sm text-[var(--color-text-muted)]">
                        Create first workspace to start
                    </p>
                    <Button onClick={() => setShowModal(true)}>Create First Workspace</Button>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {workspaces.map((ws: Workspace) => (
                        <button
                            key={ws.id}
                            onClick={() => navigate(`/w/${ws.id}/brands`)}
                            className="glass rounded-xl p-5 text-left transition-all hover:border-[#4FACFE]/30 hover:shadow-lg"
                        >
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#00F2FE]/20 to-[#4FACFE]/20 text-xl">
                                🏢
                            </div>
                            <h3 className="font-medium text-[var(--color-text)]">{ws.name}</h3>
                            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{ws.slug}</p>
                            <span className="mt-3 inline-block rounded-full bg-white/5 px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
                                {ws.role}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => setShowModal(false)}
                title="Create New Workspace"
                confirmLabel="Create"
                onConfirm={handleSubmit(onSubmit)}
                confirmLoading={createMutation.isPending}
            >
                <div className="space-y-4">
                    <Input
                        label="Name Workspace"
                        error={errors.name?.message}
                        {...register('name')}
                    />
                </div>
            </Modal>
        </div>
    );
}
