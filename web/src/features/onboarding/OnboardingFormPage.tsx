import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '@/api/client';
import { toast } from '@/components/ui/Toast';
import Button from '@/components/ui/Button';
import FieldWrapper from './FieldWrapper';
import { useOnboardingGenerate } from '@/hooks/useOnboardingGenerate';
import {
    defaultFormData,
    type OnboardingFormData,
    type GenerateResult,
    type FieldSuggestionResult,
} from '@/types/onboarding';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingFormPage() {
    const { brandId } = useParams<{ brandId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const bid = Number(brandId);

    // ── State ──────────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState<OnboardingFormData>(defaultFormData);
    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [fieldLoadingKey, setFieldLoadingKey] = useState<string | null>(null);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const [errors, setErrors] = useState<
        Partial<Record<keyof OnboardingFormData | 'aiPrompt', string>>
    >({});

    const generateMutation = useOnboardingGenerate(bid);

    // ── Mount: pre-populate from existing profile or Back-to-Edit state ────────
    useEffect(() => {
        // Check if navigated back from Preview with formData in state
        const stateFormData = (location.state as { formData?: OnboardingFormData } | null)
            ?.formData;
        if (stateFormData) {
            setFormData(stateFormData);
            return;
        }

        // Otherwise fetch brand and pre-populate from existing profile
        apiClient
            .get<{
                profile?: {
                    summary?: string;
                    targetAudience?: Array<{ segment: string }>;
                    valueProps?: string[];
                    toneGuidelines?: { voice?: string };
                    businessGoals?: string[];
                    messagingAngles?: string[];
                };
                name?: string;
                websiteUrl?: string;
                industry?: string;
                description?: string;
            }>(`/api/brands/${bid}`)
            .then((res) => {
                const brand = res.data;
                if (brand.profile) {
                    const p = brand.profile;
                    setFormData((prev) => ({
                        ...prev,
                        brandName: brand.name ?? prev.brandName,
                        websiteUrl: brand.websiteUrl ?? prev.websiteUrl,
                        industry: brand.industry ?? prev.industry,
                        description: brand.description ?? prev.description,
                        targetAudience: p.targetAudience?.map((t) => t.segment).join(', ') ?? prev.targetAudience,
                        toneOfVoice: p.toneGuidelines?.voice ?? prev.toneOfVoice,
                        businessGoals: p.businessGoals?.join('\n') ?? prev.businessGoals,
                    }));
                } else {
                    // Pre-populate basic brand fields even without profile
                    setFormData((prev) => ({
                        ...prev,
                        brandName: brand.name ?? prev.brandName,
                        websiteUrl: brand.websiteUrl ?? prev.websiteUrl,
                        industry: brand.industry ?? prev.industry,
                        description: brand.description ?? prev.description,
                    }));
                }
            })
            .catch(() => {
                // Non-critical — form still usable without pre-population
            });
    }, [bid]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Field change helper ────────────────────────────────────────────────────
    function setField<K extends keyof OnboardingFormData>(key: K, value: OnboardingFormData[K]) {
        setFormData((prev) => ({ ...prev, [key]: value }));
        if (errors[key]) {
            setErrors((prev) => ({ ...prev, [key]: undefined }));
        }
    }

    // ── AI Generate All ────────────────────────────────────────────────────────
    async function handleGenerateAll() {
        if (!aiPrompt.trim()) {
            setErrors((prev) => ({ ...prev, aiPrompt: 'Enter the describe!' }));
            return;
        }
        setErrors((prev) => ({ ...prev, aiPrompt: undefined }));
        setIsGeneratingAll(true);
        try {
            const result = await generateMutation.mutateAsync({ formData, prompt: aiPrompt });
            const full = result as GenerateResult;
            if (full.profile) {
                const p = full.profile;
                setFormData((prev) => ({
                    ...prev,
                    targetAudience: p.targetAudience?.map((t) => t.segment).join(', ') ?? prev.targetAudience,
                    toneOfVoice: p.toneGuidelines?.voice ?? prev.toneOfVoice,
                    businessGoals: p.businessGoals?.join('\n') ?? prev.businessGoals,
                    description: p.summary ?? prev.description,
                }));
                if (full.pillars?.length) {
                    setFormData((prev) => ({
                        ...prev,
                        contentPillars: full.pillars.map((pl) => pl.name).join('\n'),
                    }));
                }
            }
        } catch {
            toast.error('Error when generating AI content! Please try later');
        } finally {
            setIsGeneratingAll(false);
        }
    }

    // ── Field AI Suggest ───────────────────────────────────────────────────────
    async function handleFieldSuggest(fieldKey: string) {
        setFieldLoadingKey(fieldKey);
        try {
            const result = await generateMutation.mutateAsync({ formData, fieldKey });
            const suggestion = result as FieldSuggestionResult;
            if (suggestion.fieldKey && suggestion.suggestion !== undefined) {
                setField(
                    suggestion.fieldKey as keyof OnboardingFormData,
                    suggestion.suggestion as OnboardingFormData[keyof OnboardingFormData],
                );
            }
        } catch {
            toast.error('Unable to generate AI content: ');
        } finally {
            setFieldLoadingKey(null);
        }
    }

    // ── Form submission ────────────────────────────────────────────────────────
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        // Validate brandName
        if (!formData.brandName.trim()) {
            setErrors((prev) => ({ ...prev, brandName: 'Brand name is required' }));
            return;
        }

        // Validate websiteUrl (optional but must be valid if provided)
        if (formData.websiteUrl.trim() && !isValidUrl(formData.websiteUrl.trim())) {
            setErrors((prev) => ({ ...prev, websiteUrl: 'Invalid URL (must start with http:// or https://)' }));
            return;
        }

        setErrors({});

        try {
            const result = await generateMutation.mutateAsync({ formData });
            const full = result as GenerateResult;
            navigate(`/b/${brandId}/onboarding/preview`, {
                state: {
                    profile: full.profile,
                    pillars: full.pillars,
                    formData,
                },
            });
        } catch {
            toast.error('Cannot create Brand Profile. Please try again.');
        }
    }

    const isSubmitting = generateMutation.isPending && fieldLoadingKey === null && !isGeneratingAll;
    const isDisabled = isGeneratingAll || fieldLoadingKey !== null || isSubmitting;

    // ── Input class ────────────────────────────────────────────────────────────
    const inputCls =
        'rounded-xl border border-[var(--color-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-text)] outline-none focus:border-[#4FACFE] transition-colors w-full placeholder:text-[var(--color-text-muted)]';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="h-full overflow-y-auto bg-[var(--color-bg)]">
            <form onSubmit={handleSubmit} noValidate>
                <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

                    {/* Page header */}
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] bg-clip-text text-transparent">
                            Brand Profile Setup
                        </h1>
                        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                            Fill in your brand information. AI will assist in content creation.
                        </p>
                    </div>

                    {/* ── AI Generate Panel ──────────────────────────────────────────────── */}
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white/5 p-5 space-y-3">
                        <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                            🤖 AI Generate
                        </h2>
                        <div className="space-y-1">
                            <textarea
                                rows={3}
                                value={aiPrompt}
                                onChange={(e) => {
                                    setAiPrompt(e.target.value);
                                    if (errors.aiPrompt) {
                                        setErrors((prev) => ({ ...prev, aiPrompt: undefined }));
                                    }
                                }}
                                placeholder="Describe your brand for AI to auto-fill the form..."
                                className={`${inputCls} resize-none`}
                                disabled={isGeneratingAll}
                            />
                            {errors.aiPrompt && (
                                <p className="text-xs text-red-400">{errors.aiPrompt}</p>
                            )}
                        </div>
                        <div className="flex justify-end">
                            <Button
                                type="button"
                                onClick={handleGenerateAll}
                                loading={isGeneratingAll}
                                disabled={isGeneratingAll || fieldLoadingKey !== null}
                            >
                                ✨ AI Generate All →
                            </Button>
                        </div>
                    </div>

                    {/* ── Basic Section ──────────────────────────────────────────────────── */}
                    <div className="space-y-5">
                        <h2 className="text-base font-semibold bg-gradient-to-r from-[#00F2FE] to-[#4FACFE] bg-clip-text text-transparent">
                            Basic Information
                        </h2>

                        {/* brandName */}
                        <FieldWrapper
                            label="Brand Name *"
                            fieldKey="brandName"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.brandName}
                        >
                            <input
                                type="text"
                                value={formData.brandName}
                                onChange={(e) => setField('brandName', e.target.value)}
                                placeholder="Enter brand name"
                                className={inputCls}
                            />
                        </FieldWrapper>

                        {/* websiteUrl */}
                        <FieldWrapper
                            label="Website URL"
                            fieldKey="websiteUrl"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.websiteUrl}
                        >
                            <input
                                type="url"
                                value={formData.websiteUrl}
                                onChange={(e) => setField('websiteUrl', e.target.value)}
                                placeholder="https://example.com"
                                className={inputCls}
                            />
                        </FieldWrapper>

                        {/* industry */}
                        <FieldWrapper
                            label="Industry"
                            fieldKey="industry"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.industry}
                        >
                            <input
                                type="text"
                                value={formData.industry}
                                onChange={(e) => setField('industry', e.target.value)}
                                placeholder="Example: E-commerce, SaaS, F&B..."
                                className={inputCls}
                            />
                        </FieldWrapper>

                        {/* description */}
                        <FieldWrapper
                            label="Brand Description"
                            fieldKey="description"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.description}
                        >
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setField('description', e.target.value)}
                                placeholder="Brief description of your brand..."
                                className={`${inputCls} resize-none`}
                            />
                        </FieldWrapper>

                        {/* targetAudience */}
                        <FieldWrapper
                            label="Target Audience"
                            fieldKey="targetAudience"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.targetAudience}
                        >
                            <textarea
                                rows={3}
                                value={formData.targetAudience}
                                onChange={(e) => setField('targetAudience', e.target.value)}
                                placeholder="Describe target customers..."
                                className={`${inputCls} resize-none`}
                            />
                        </FieldWrapper>

                        {/* toneOfVoice */}
                        <FieldWrapper
                            label="Brand Tone"
                            fieldKey="toneOfVoice"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.toneOfVoice}
                        >
                            <input
                                type="text"
                                value={formData.toneOfVoice}
                                onChange={(e) => setField('toneOfVoice', e.target.value)}
                                placeholder="Example: Professional, friendly, creative..."
                                className={inputCls}
                            />
                        </FieldWrapper>

                        {/* businessGoals */}
                        <FieldWrapper
                            label="Business Objectives"
                            fieldKey="businessGoals"
                            fieldLoadingKey={fieldLoadingKey}
                            onAISuggest={handleFieldSuggest}
                            error={errors.businessGoals}
                        >
                            <textarea
                                rows={3}
                                value={formData.businessGoals}
                                onChange={(e) => setField('businessGoals', e.target.value)}
                                placeholder="Your main business objectives..."
                                className={`${inputCls} resize-none`}
                            />
                        </FieldWrapper>
                    </div>

                    {/* ── Advanced Section ───────────────────────────────────────────────── */}
                    <div className="space-y-5">
                        {/* Toggle button */}
                        <button
                            type="button"
                            onClick={() => setAdvancedExpanded((v) => !v)}
                            className="flex items-center gap-2 text-sm font-semibold text-[#4FACFE] hover:underline transition-colors"
                        >
                            {advancedExpanded ? '▲ Hide advanced info' : '▼ Advanced info'}
                        </button>

                        {advancedExpanded && (
                            <div className="space-y-5">
                                {/* usp */}
                                <FieldWrapper
                                    label="Unique Selling Proposition (USP)"
                                    fieldKey="usp"
                                    fieldLoadingKey={fieldLoadingKey}
                                    onAISuggest={handleFieldSuggest}
                                    error={errors.usp}
                                >
                                    <textarea
                                        rows={2}
                                        value={formData.usp}
                                        onChange={(e) => setField('usp', e.target.value)}
                                        placeholder="What makes your brand different?"
                                        className={`${inputCls} resize-none`}
                                    />
                                </FieldWrapper>

                                {/* competitors */}
                                <FieldWrapper
                                    label="Competitors"
                                    fieldKey="competitors"
                                    fieldLoadingKey={fieldLoadingKey}
                                    onAISuggest={handleFieldSuggest}
                                    error={errors.competitors}
                                >
                                    <textarea
                                        rows={2}
                                        value={formData.competitors}
                                        onChange={(e) => setField('competitors', e.target.value)}
                                        placeholder="List main competitors..."
                                        className={`${inputCls} resize-none`}
                                    />
                                </FieldWrapper>

                                {/* keyMessages */}
                                <FieldWrapper
                                    label="Key Messages"
                                    fieldKey="keyMessages"
                                    fieldLoadingKey={fieldLoadingKey}
                                    onAISuggest={handleFieldSuggest}
                                    error={errors.keyMessages}
                                >
                                    <textarea
                                        rows={2}
                                        value={formData.keyMessages}
                                        onChange={(e) => setField('keyMessages', e.target.value)}
                                        placeholder="Core messages you want to convey..."
                                        className={`${inputCls} resize-none`}
                                    />
                                </FieldWrapper>

                                {/* contentPillars */}
                                <FieldWrapper
                                    label="Content Pillars"
                                    fieldKey="contentPillars"
                                    fieldLoadingKey={fieldLoadingKey}
                                    onAISuggest={handleFieldSuggest}
                                    error={errors.contentPillars}
                                >
                                    <textarea
                                        rows={2}
                                        value={formData.contentPillars}
                                        onChange={(e) => setField('contentPillars', e.target.value)}
                                        placeholder="Main content topics (one per line)..."
                                        className={`${inputCls} resize-none`}
                                    />
                                </FieldWrapper>

                                {/* socialChannels — comma-separated, stored as string[] */}
                                <FieldWrapper
                                    label="Social Channels"
                                    fieldKey="socialChannels"
                                    fieldLoadingKey={fieldLoadingKey}
                                    onAISuggest={handleFieldSuggest}
                                    error={errors.socialChannels as string | undefined}
                                >
                                    <input
                                        type="text"
                                        value={formData.socialChannels.join(', ')}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            // Convert comma-separated string to array, trim each entry
                                            const arr = raw
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
                                            setField('socialChannels', arr);
                                        }}
                                        placeholder="Facebook, Instagram, TikTok, LinkedIn..."
                                        className={inputCls}
                                    />
                                </FieldWrapper>
                            </div>
                        )}
                    </div>

                    {/* ── Submit ─────────────────────────────────────────────────────────── */}
                    <div className="pt-2 pb-8">
                        <Button
                            type="submit"
                            loading={isSubmitting}
                            disabled={isDisabled}
                            className="w-full"
                        >
                            Preview →
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
