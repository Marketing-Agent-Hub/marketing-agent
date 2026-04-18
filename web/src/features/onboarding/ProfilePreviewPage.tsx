import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import { useOnboardingSave } from '@/hooks/useOnboardingSave';
import type {
    GeneratedBrandProfile,
    GeneratedContentPillar,
    OnboardingFormData,
} from '@/types/onboarding';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewState {
    profile: GeneratedBrandProfile;
    pillars: GeneratedContentPillar[];
    formData: OnboardingFormData;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-5 space-y-3">
            <h2 className="text-sm font-semibold bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] bg-clip-text text-transparent uppercase tracking-wide">
                {title}
            </h2>
            {children}
        </div>
    );
}

function BulletList({ items }: { items: string[] }) {
    if (!items?.length) return <p className="text-sm text-[var(--color-text-muted)]">—</p>;
    return (
        <ul className="space-y-1">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4FACFE]" />
                    {item}
                </li>
            ))}
        </ul>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePreviewPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const state = location.state as PreviewState | null;

    // Guard: redirect if navigated directly without state
    if (!state?.profile || !state?.pillars) {
        navigate(`/b/${brandId}/onboarding`, { replace: true });
        return null;
    }

    const { profile, pillars, formData } = state;
    const bid = Number(brandId);

    const saveMutation = useOnboardingSave(bid);

    // ── Handlers ───────────────────────────────────────────────────────────────

    function handleBackToEdit() {
        navigate(`/b/${brandId}/onboarding`, { state: { formData } });
    }

    async function handleConfirmSave() {
        try {
            await saveMutation.mutateAsync({ profile, pillars });
            navigate(`/b/${brandId}/strategy`);
        } catch {
            toast.error('Không thể lưu Brand Profile. Vui lòng thử lại.');
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="h-full overflow-y-auto bg-[var(--color-bg)]">
            <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

                {/* Page header */}
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] bg-clip-text text-transparent">
                        Xem trước Brand Profile
                    </h1>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                        Kiểm tra thông tin trước khi xác nhận lưu.
                    </p>
                </div>

                {/* 1. Summary */}
                <SectionCard title="Tóm tắt thương hiệu">
                    <p className="text-sm text-[var(--color-text)] leading-relaxed">
                        {profile.summary || '—'}
                    </p>
                </SectionCard>

                {/* 2. Target Audience */}
                <SectionCard title="Đối tượng mục tiêu">
                    {profile.targetAudience?.length ? (
                        <div className="space-y-4">
                            {profile.targetAudience.map((item, i) => (
                                <div key={i} className="space-y-1">
                                    <p className="text-sm font-medium text-[var(--color-text)]">
                                        {item.segment}
                                    </p>
                                    {item.painPoints?.length > 0 && (
                                        <ul className="space-y-0.5 pl-3">
                                            {item.painPoints.map((pt, j) => (
                                                <li
                                                    key={j}
                                                    className="flex items-start gap-2 text-xs text-[var(--color-text-muted)]"
                                                >
                                                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-muted)]" />
                                                    {pt}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-[var(--color-text-muted)]">—</p>
                    )}
                </SectionCard>

                {/* 3. Value Propositions */}
                <SectionCard title="Giá trị cốt lõi">
                    <BulletList items={profile.valueProps} />
                </SectionCard>

                {/* 4. Tone Guidelines */}
                <SectionCard title="Hướng dẫn giọng điệu">
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                                Giọng điệu
                            </p>
                            <p className="text-sm text-[var(--color-text)]">
                                {profile.toneGuidelines?.voice || '—'}
                            </p>
                        </div>
                        {profile.toneGuidelines?.avoid?.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                                    Tránh
                                </p>
                                <BulletList items={profile.toneGuidelines.avoid} />
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* 5. Business Goals */}
                <SectionCard title="Mục tiêu kinh doanh">
                    <BulletList items={profile.businessGoals} />
                </SectionCard>

                {/* 6. Messaging Angles */}
                <SectionCard title="Góc độ thông điệp">
                    <BulletList items={profile.messagingAngles} />
                </SectionCard>

                {/* Content Pillars */}
                {pillars?.length > 0 && (
                    <SectionCard title="Content Pillars">
                        <div className="space-y-3">
                            {pillars.map((pillar, i) => (
                                <div key={i} className="space-y-0.5">
                                    <p className="text-sm font-bold text-[var(--color-text)]">
                                        {pillar.name}
                                    </p>
                                    {pillar.description && (
                                        <p className="text-sm text-[var(--color-text-muted)]">
                                            {pillar.description}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SectionCard>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-4 pt-2 pb-8">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBackToEdit}
                        disabled={saveMutation.isPending}
                    >
                        ← Back to Edit
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirmSave}
                        loading={saveMutation.isPending}
                        disabled={saveMutation.isPending}
                    >
                        ✓ Confirm &amp; Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
