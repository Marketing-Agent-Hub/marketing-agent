import { Toaster, toast as sonnerToast } from 'sonner';

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                style: {
                    background: '#1a1a2e',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                },
            }}
        />
    );
}

export const toast = {
    success: (msg: string) => sonnerToast.success(msg),
    error: (msg: string) => sonnerToast.error(msg),
    info: (msg: string) => sonnerToast.info(msg),
};
