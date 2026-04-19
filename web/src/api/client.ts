import axios from 'axios';
import type { AxiosError } from 'axios';

interface ApiErrorResponse {
    error?: { message: string };
    message?: string;
}

// Toast will be injected after app initializes to avoid circular deps
let toastFn: ((msg: string) => void) | null = null;
export function setToastFn(fn: (msg: string) => void) {
    toastFn = fn;
}

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '',
    timeout: 30_000,
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('app_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: centralized error handling
apiClient.interceptors.response.use(
    (res) => res,
    (error: AxiosError<ApiErrorResponse>) => {
        const status = error.response?.status;
        const data = error.response?.data;

        if (status === 401) {
            localStorage.removeItem('app_token');
            toastFn?.('Session expired. Please log in again.');
            window.location.href = '/login';
        } else if (status === 422 || data?.error?.message) {
            const msg = data?.error?.message ?? data?.message ?? 'An error occurred';
            toastFn?.(msg);
        } else if (status && status >= 500) {
            toastFn?.('Cannot connect to server');
        }

        return Promise.reject(error);
    }
);

export default apiClient;
