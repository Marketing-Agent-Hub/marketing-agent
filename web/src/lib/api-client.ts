import type {
    Source,
    CreateSourceInput,
    UpdateSourceInput,
    LoginInput,
    LoginResponse,
    UserResponse,
    RSSValidationResult,
    ApiErrorResponse,
    DailyPost,
    UpdateDraftInput,
    RejectDraftInput,
    GetDraftsQuery,
    PipelineStats,
    RecentActivity,
    Bottlenecks,
    MonitoringOverview,
    SystemLog,
    LogStats,
    GetLogsQuery,
    SystemMetric,
    MetricStats,
    GetMetricsQuery,
    HealthStatus,
    HealthCheck,
    PerformanceTrace,
    TraceStats,
    GetTracesQuery,
    Item,
    ItemsStats,
    GetItemsQuery,
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

    // Draft endpoints
    async getDrafts(query?: GetDraftsQuery): Promise<DailyPost[]> {
        const params = new URLSearchParams();
        if (query?.status) params.append('status', query.status);
        if (query?.targetDate) params.append('targetDate', query.targetDate);
        if (query?.timeSlot) params.append('timeSlot', query.timeSlot);

        const queryString = params.toString();
        const endpoint = queryString ? `/drafts?${queryString}` : '/drafts';

        return this.request<DailyPost[]>(endpoint);
    }

    async getDraftById(id: number): Promise<DailyPost> {
        return this.request<DailyPost>(`/drafts/${id}`);
    }

    async updateDraft(id: number, input: UpdateDraftInput): Promise<DailyPost> {
        return this.request<DailyPost>(`/drafts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(input),
        });
    }

    async approveDraft(id: number): Promise<DailyPost> {
        return this.request<DailyPost>(`/drafts/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async rejectDraft(id: number, input: RejectDraftInput): Promise<DailyPost> {
        return this.request<DailyPost>(`/drafts/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify(input),
        });
    }

    // Stats endpoints
    async getPipelineStats(): Promise<PipelineStats> {
        return this.request<PipelineStats>('/stats/pipeline');
    }

    async getRecentActivity(limit?: number): Promise<RecentActivity> {
        const params = limit ? `?limit=${limit}` : '';
        return this.request<RecentActivity>(`/stats/activity${params}`);
    }

    async getBottlenecks(): Promise<Bottlenecks> {
        return this.request<Bottlenecks>('/stats/bottlenecks');
    }

    // Admin trigger endpoints
    async triggerIngest(): Promise<void> {
        await this.request<void>('/admin/ingest/trigger', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    }

    async triggerExtraction(limit?: number): Promise<void> {
        await this.request<void>('/admin/extraction/trigger', {
            method: 'POST',
            body: JSON.stringify({ limit }),
        });
    }

    async triggerFiltering(limit?: number): Promise<void> {
        await this.request<void>('/admin/filtering/trigger', {
            method: 'POST',
            body: JSON.stringify({ limit }),
        });
    }

    async triggerAIStageA(limit?: number): Promise<void> {
        await this.request<void>('/admin/ai/stage-a/trigger', {
            method: 'POST',
            body: JSON.stringify({ limit }),
        });
    }

    async triggerAIStageB(limit?: number): Promise<void> {
        await this.request<void>('/admin/ai/stage-b/trigger', {
            method: 'POST',
            body: JSON.stringify({ limit }),
        });
    }

    async triggerDigest(date?: string): Promise<void> {
        await this.request<void>('/admin/digest/trigger', {
            method: 'POST',
            body: JSON.stringify({ date }),
        });
    }
    // Monitoring endpoints
    async getMonitoringOverview(): Promise<MonitoringOverview> {
        return this.request<MonitoringOverview>('/monitor/overview');
    }

    async getLogs(query?: GetLogsQuery): Promise<SystemLog[]> {
        const params = new URLSearchParams();
        if (query?.level) params.append('level', query.level);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.traceId) params.append('traceId', query.traceId);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());

        const queryString = params.toString();
        return this.request<SystemLog[]>(`/monitor/logs${queryString ? `?${queryString}` : ''}`);
    }

    async getLogStats(startDate?: string, endDate?: string): Promise<LogStats[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const queryString = params.toString();
        return this.request<LogStats[]>(`/monitor/logs/stats${queryString ? `?${queryString}` : ''}`);
    }

    async getMetrics(query?: GetMetricsQuery): Promise<SystemMetric[]> {
        const params = new URLSearchParams();
        if (query?.name) params.append('name', query.name);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());

        const queryString = params.toString();
        return this.request<SystemMetric[]>(`/monitor/metrics${queryString ? `?${queryString}` : ''}`);
    }

    async getMetricStats(name: string): Promise<MetricStats> {
        return this.request<MetricStats>(`/monitor/metrics/stats?name=${encodeURIComponent(name)}`);
    }

    async getSystemMetrics(): Promise<Record<string, any>> {
        return this.request<Record<string, any>>('/monitor/metrics/system');
    }

    async getHealthStatus(): Promise<HealthStatus> {
        return this.request<HealthStatus>('/monitor/health');
    }

    async getHealthHistory(service?: string, limit?: number): Promise<HealthCheck[]> {
        const params = new URLSearchParams();
        if (service) params.append('service', service);
        if (limit) params.append('limit', limit.toString());

        const queryString = params.toString();
        return this.request<HealthCheck[]>(`/monitor/health/history${queryString ? `?${queryString}` : ''}`);
    }

    async getTraces(query?: GetTracesQuery): Promise<PerformanceTrace[]> {
        const params = new URLSearchParams();
        if (query?.name) params.append('name', query.name);
        if (query?.minDuration) params.append('minDuration', query.minDuration.toString());
        if (query?.status) params.append('status', query.status);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());

        const queryString = params.toString();
        return this.request<PerformanceTrace[]>(`/monitor/traces${queryString ? `?${queryString}` : ''}`);
    }

    async getSlowTraces(threshold?: number): Promise<PerformanceTrace[]> {
        const params = threshold ? `?threshold=${threshold}` : '';
        return this.request<PerformanceTrace[]>(`/monitor/traces/slow${params}`);
    }

    async getTraceStats(name: string): Promise<TraceStats> {
        return this.request<TraceStats>(`/monitor/traces/stats?name=${encodeURIComponent(name)}`);
    }

    async getTraceById(traceId: string): Promise<PerformanceTrace[]> {
        return this.request<PerformanceTrace[]>(`/monitor/traces/${traceId}`);
    }

    // Items API
    async getItems(query?: GetItemsQuery): Promise<{ items: Item[]; total: number; limit: number; offset: number }> {
        const params = new URLSearchParams();
        if (query?.status) params.append('status', query.status);
        if (query?.sourceId) params.append('sourceId', query.sourceId.toString());
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());
        if (query?.search) params.append('search', query.search);

        const queryString = params.toString();
        return this.request<{ items: Item[]; total: number; limit: number; offset: number }>(`/items${queryString ? `?${queryString}` : ''}`);
    }

    async getItemById(id: number): Promise<Item> {
        return this.request<Item>(`/items/${id}`);
    }

    async getItemsStats(): Promise<ItemsStats> {
        return this.request<ItemsStats>('/items/stats');
    }
}

export const apiClient = new ApiClient();
