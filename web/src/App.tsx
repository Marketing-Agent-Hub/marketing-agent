import AppRouter from '@/router';
import { ToastProvider } from '@/components/ui/Toast';
import { setToastFn } from '@/api/client';
import { toast } from '@/components/ui/Toast';

// Wire up toast to API client interceptors
setToastFn(toast.error);

export default function App() {
  return (
    <>
      <ToastProvider />
      <AppRouter />
    </>
  );
}
