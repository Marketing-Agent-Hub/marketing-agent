import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useReviewQueue', () => ({
    useReviewQueue: vi.fn(),
    useApproveDraft: vi.fn(),
    useRejectDraft: vi.fn(),
    useUpdateDraft: vi.fn(),
}));

vi.mock('@/components/ui/Toast', () => ({
    toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { useReviewQueue, useApproveDraft, useRejectDraft, useUpdateDraft } from '@/hooks/useReviewQueue';
import { toast } from '@/components/ui/Toast';
import ReviewQueuePage from '@/features/review-queue/ReviewQueuePage';
import type { ContentDraft } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

const mockDraft: ContentDraft = {
    id: 'draft-1',
    brandId: 1,
    content: 'Original content here',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    brief: {
        id: 'brief-1',
        title: 'Test Brief',
        objective: 'Increase engagement',
        keyAngle: 'AI innovation',
        callToAction: 'Learn more',
    },
};

const mockDraft2: ContentDraft = {
    id: 'draft-2',
    brandId: 1,
    content: 'Second draft content',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
};

function makeMutationMock(mutateFn = vi.fn().mockResolvedValue({})) {
    return {
        mutate: mutateFn,
        mutateAsync: mutateFn,
        isPending: false,
        isError: false,
        isSuccess: false,
        reset: vi.fn(),
    };
}

function renderReviewQueue(brandId = '1') {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
        React.createElement(
            QueryClientProvider,
            { client: qc },
            React.createElement(
                MemoryRouter,
                { initialEntries: [`/b/${brandId}/review-queue`] },
                React.createElement(
                    Routes,
                    null,
                    React.createElement(Route, {
                        path: '/b/:brandId/review-queue',
                        element: React.createElement(ReviewQueuePage),
                    })
                )
            )
        )
    );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ReviewQueuePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useUpdateDraft).mockReturnValue(makeMutationMock() as any);
    });

    // ── Loading state ──────────────────────────────────────────────────────

    it('shows skeleton while loading', () => {
        vi.mocked(useReviewQueue).mockReturnValue({ data: undefined, isLoading: true } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();
        // Skeleton renders without crashing
        expect(document.body).toBeTruthy();
    });

    // ── Empty state ────────────────────────────────────────────────────────

    it('shows empty state when no drafts', () => {
        vi.mocked(useReviewQueue).mockReturnValue({ data: [], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();
        expect(screen.getByText(/Không có bài nào chờ duyệt/i)).toBeTruthy();
    });

    // ── Approve flow ───────────────────────────────────────────────────────

    it('calls approve mutation when Approve button is clicked', async () => {
        const approveFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock(approveFn) as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        const approveBtn = screen.getByRole('button', { name: /✓ Approve/i });
        await userEvent.click(approveBtn);

        await waitFor(() => {
            expect(approveFn).toHaveBeenCalledWith('draft-1');
        });
    });

    it('shows success toast after approve', async () => {
        const approveFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock(approveFn) as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();
        await userEvent.click(screen.getByRole('button', { name: /✓ Approve/i }));

        await waitFor(() => {
            expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('duyệt'));
        });
    });

    it('auto-loads next item after approve (resets to index 0)', async () => {
        const approveFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft, mockDraft2], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock(approveFn) as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        // Navigate to second draft
        const dots = document.querySelectorAll('button[class*="rounded-full"]');
        if (dots[1]) fireEvent.click(dots[1]);

        await userEvent.click(screen.getByRole('button', { name: /✓ Approve/i }));

        await waitFor(() => {
            // After approve, currentIdx resets to 0 — first draft content shown
            expect(screen.getByDisplayValue('Original content here')).toBeTruthy();
        });
    });

    // ── Reject flow ────────────────────────────────────────────────────────

    it('opens reject popover when Reject button is clicked', async () => {
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        const rejectBtn = screen.getByText('Reject');
        await userEvent.click(rejectBtn);

        expect(screen.getByPlaceholderText(/Nhập lý do/i)).toBeTruthy();
    });

    it('calls reject mutation with comment when confirmed', async () => {
        const rejectFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock(rejectFn) as any);

        renderReviewQueue();

        // Open popover
        await userEvent.click(screen.getByText('Reject'));

        // Type reason
        const textarea = screen.getByPlaceholderText(/Nhập lý do/i);
        await userEvent.type(textarea, 'Nội dung không phù hợp');

        // Confirm reject (second "Xác nhận" button in popover)
        const confirmBtn = screen.getByText('Xác nhận');
        await userEvent.click(confirmBtn);

        await waitFor(() => {
            expect(rejectFn).toHaveBeenCalledWith({
                draftId: 'draft-1',
                comment: 'Nội dung không phù hợp',
            });
        });
    });

    // ── Keyboard shortcuts ─────────────────────────────────────────────────

    it('triggers approve on Ctrl+Enter', async () => {
        const approveFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock(approveFn) as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        await act(async () => {
            fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });
        });

        await waitFor(() => {
            expect(approveFn).toHaveBeenCalledWith('draft-1');
        });
    });

    it('triggers approve on Cmd+Enter (metaKey)', async () => {
        const approveFn = vi.fn().mockResolvedValue({});
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock(approveFn) as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        await act(async () => {
            fireEvent.keyDown(document, { key: 'Enter', metaKey: true });
        });

        await waitFor(() => {
            expect(approveFn).toHaveBeenCalledWith('draft-1');
        });
    });

    it('opens reject popover on Escape key', async () => {
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        await act(async () => {
            fireEvent.keyDown(document, { key: 'Escape' });
        });

        expect(screen.getByPlaceholderText(/Nhập lý do/i)).toBeTruthy();
    });

    it('closes reject popover on second Escape key', async () => {
        vi.mocked(useReviewQueue).mockReturnValue({ data: [mockDraft], isLoading: false } as any);
        vi.mocked(useApproveDraft).mockReturnValue(makeMutationMock() as any);
        vi.mocked(useRejectDraft).mockReturnValue(makeMutationMock() as any);

        renderReviewQueue();

        // Open
        await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });
        expect(screen.getByPlaceholderText(/Nhập lý do/i)).toBeTruthy();

        // Close
        await act(async () => { fireEvent.keyDown(document, { key: 'Escape' }); });
        expect(screen.queryByPlaceholderText(/Nhập lý do/i)).toBeNull();
    });
});
