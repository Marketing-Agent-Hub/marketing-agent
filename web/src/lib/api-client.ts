import type {
    Source,
    CreateSourceInput,
    UpdateSourceInput,
    LoginInput,
    LoginResponse,
    UserResponse,
    RSSValidationResult,
    ApiErrorResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

class ApiClient {
    private getToken(): string | null {
        return localStorage.getItem('token');
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            if (response.status === 401) {
                // Unauthorized - clear token and redirect
                localStorage.removeItem('token');
                window.location.href = '/login';
                throw new Error('Unauthorized');
            }

            const errorData: ApiErrorResponse = await response.json();
            throw new Error(errorData.error.message || 'API request failed');
        }

        return response.json();
    }

    // Auth endpoints
    async login(credentials: LoginInput): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        // Store token
        localStorage.setItem('token', response.token);

        return response;
    }

    async getMe(): Promise<UserResponse> {
        return this.request<UserResponse>('/auth/me');
    }

    logout(): void {
        localStorage.removeItem('token');
    }

    // Source endpoints
    async getSources(): Promise<Source[]> {
        return this.request<Source[]>('/sources');
    }

    async createSource(input: CreateSourceInput): Promise<Source> {
        return this.request<Source>('/sources', {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }

    async updateSource(id: number, input: UpdateSourceInput): Promise<Source> {
        return this.request<Source>(`/sources/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
        });
    }

    async deleteSource(id: number): Promise<void> {
        await this.request<void>(`/sources/${id}`, {
            method: 'DELETE',
        });
    }

    async validateRss(url: string): Promise<RSSValidationResult> {
        return this.request<RSSValidationResult>('/sources/validate', {
            method: 'POST',
            body: JSON.stringify({ url }),
        });
    }
}

export const apiClient = new ApiClient();
