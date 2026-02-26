import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/api-client';
import type { Source, SourceLang } from '../types/api';

const sourceSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    rssUrl: z.string().url('Invalid URL'),
    siteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
    lang: z.enum(['VI', 'EN', 'MIXED']),
    topicTags: z.string(),
    trustScore: z.number().int().min(0).max(100),
    enabled: z.boolean(),
    fetchIntervalMinutes: z.number().int().min(5).max(1440),
    denyKeywords: z.string(),
    notes: z.string().max(1000).optional().or(z.literal('')),
});

type SourceFormData = z.infer<typeof sourceSchema>;

interface SourceFormModalProps {
    source: Source | null;
    onClose: () => void;
}

export function SourceFormModal({ source, onClose }: SourceFormModalProps) {
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [validating, setValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<{
        ok: boolean;
        type?: string;
        title?: string;
        itemsCount?: number;
        error?: string;
    } | null>(null);

    const isEditMode = !!source?.id;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        watch,
    } = useForm<SourceFormData>({
        resolver: zodResolver(sourceSchema),
        defaultValues: {
            name: source?.name || '',
            rssUrl: source?.rssUrl || '',
            siteUrl: source?.siteUrl || '',
            lang: (source?.lang as SourceLang) || 'MIXED',
            topicTags: source?.topicTags?.join(', ') || '',
            trustScore: source?.trustScore || 70,
            enabled: source?.enabled || false,
            fetchIntervalMinutes: source?.fetchIntervalMinutes || 60,
            denyKeywords: source?.denyKeywords?.join(', ') || '',
            notes: source?.notes || '',
        },
    });

    const createMutation = useMutation({
        mutationFn: (data: SourceFormData) => {
            const payload = {
                ...data,
                siteUrl: data.siteUrl || undefined,
                topicTags: data.topicTags
                    ? data.topicTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
                    : [],
                denyKeywords: data.denyKeywords
                    ? data.denyKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
                    : [],
                notes: data.notes || undefined,
            };
            return apiClient.createSource(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            onClose();
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to create source');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: SourceFormData) => {
            const payload = {
                ...data,
                siteUrl: data.siteUrl || undefined,
                topicTags: data.topicTags
                    ? data.topicTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
                    : [],
                denyKeywords: data.denyKeywords
                    ? data.denyKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
                    : [],
                notes: data.notes || undefined,
            };
            return apiClient.updateSource(source!.id, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sources'] });
            onClose();
        },
        onError: (err) => {
            setError(err instanceof Error ? err.message : 'Failed to update source');
        },
    });

    const handleValidateRss = async () => {
        const rssUrl = watch('rssUrl');
        if (!rssUrl) return;

        setValidating(true);
        setValidationResult(null);
        setError(null);

        try {
            const result = await apiClient.validateRss(rssUrl);
            setValidationResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Validation failed');
        } finally {
            setValidating(false);
        }
    };

    const onSubmit = async (data: SourceFormData) => {
        setError(null);
        if (isEditMode) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                        {isEditMode ? 'Edit Source' : 'Create New Source'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Name *
                        </label>
                        <input
                            {...register('name')}
                            type="text"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                        {errors.name && (
                            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    {/* RSS URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            RSS URL *
                        </label>
                        <div className="mt-1 flex gap-2">
                            <input
                                {...register('rssUrl')}
                                type="url"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                            <button
                                type="button"
                                onClick={handleValidateRss}
                                disabled={validating}
                                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                            >
                                {validating ? 'Validating...' : 'Validate'}
                            </button>
                        </div>
                        {errors.rssUrl && (
                            <p className="mt-1 text-sm text-red-600">{errors.rssUrl.message}</p>
                        )}
                        {validationResult && (
                            <div
                                className={`mt-2 p-3 rounded-md text-sm ${validationResult.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                    }`}
                            >
                                {validationResult.ok ? (
                                    <>
                                        ✓ Valid {validationResult.type} feed: {validationResult.title} ({validationResult.itemsCount} items)
                                    </>
                                ) : (
                                    <>✗ {validationResult.error}</>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Site URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Site URL
                        </label>
                        <input
                            {...register('siteUrl')}
                            type="url"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                        {errors.siteUrl && (
                            <p className="mt-1 text-sm text-red-600">{errors.siteUrl.message}</p>
                        )}
                    </div>

                    {/* Language & Trust Score */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Language
                            </label>
                            <select
                                {...register('lang')}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            >
                                <option value="VI">Vietnamese</option>
                                <option value="EN">English</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Trust Score (0-100)
                            </label>
                            <input
                                {...register('trustScore', { valueAsNumber: true })}
                                type="number"
                                min="0"
                                max="100"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                            {errors.trustScore && (
                                <p className="mt-1 text-sm text-red-600">{errors.trustScore.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Enabled & Fetch Interval */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                {...register('enabled')}
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Enabled
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Fetch Interval (minutes)
                            </label>
                            <input
                                {...register('fetchIntervalMinutes', { valueAsNumber: true })}
                                type="number"
                                min="5"
                                max="1440"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                            />
                            {errors.fetchIntervalMinutes && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.fetchIntervalMinutes.message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Topic Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Topic Tags (comma-separated)
                        </label>
                        <input
                            {...register('topicTags')}
                            type="text"
                            placeholder="education, edtech, blockchain-tech"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Will be auto-lowercased and deduplicated
                        </p>
                    </div>

                    {/* Deny Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Deny Keywords (comma-separated)
                        </label>
                        <input
                            {...register('denyKeywords')}
                            type="text"
                            placeholder="price, trading, pump"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Filter out articles with these keywords
                        </p>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Notes
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        />
                        {errors.notes && (
                            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
