import type {
    Source,
    CreateSourceInput,
    UpdateSourceInput,
    GetSourcesQuery,
    ExportSourcesResponse,
    LoginInput,
    LoginResponse,
    UserResponse,
    RSSValidationResult,
    ApiErrorResponse,
    DailyPost,
    UpdateDraftInput,
    RejectDraftInput,
    GetDraftsQuery,
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
    ReadyItem,
    GetReadyItemsQuery,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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
    async getSources(query?: GetSourcesQuery): Promise<{ sources: Source[]; total: number; limit: number; offset: number }> {
        const params = new URLSearchParams();
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());
        if (query?.search) params.append('search', query.search);
        if (query?.enabled !== undefined) params.append('enabled', query.enabled.toString());
        if (query?.lang) params.append('lang', query.lang);
        if (query?.minTrustScore !== undefined) params.append('minTrustScore', query.minTrustScore.toString());
        if (query?.sortBy) params.append('sortBy', query.sortBy);
        if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { sources: Source[]; total: number; limit: number; offset: number } }>(`/sources${queryString ? `?${queryString}` : ''}`);

        // Backend wraps response in { success, data }
        return response?.data || { sources: [], total: 0, limit: query?.limit || 20, offset: query?.offset || 0 };
    }

    async getSourceById(id: number): Promise<Source> {
        return this.request<Source>(`/sources/${id}`);
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

    async exportSources(): Promise<Blob> {
        // API returns JSON but we convert to Blob for download functionality
        const response = await this.request<ExportSourcesResponse>('/sources/export');
        const json = JSON.stringify(response, null, 2);
        return new Blob([json], { type: 'application/json' });
    }

    // Items endpoints
    async getItems(query?: GetItemsQuery): Promise<{ items: Item[]; total: number; limit: number; offset: number }> {
        const params = new URLSearchParams();
        if (query?.status) params.append('status', query.status);
        if (query?.sourceId) params.append('sourceId', query.sourceId.toString());
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());
        if (query?.search) params.append('search', query.search);

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { items: Item[]; total: number; limit: number; offset: number } }>(`/items${queryString ? `?${queryString}` : ''}`);

        // Backend wraps response in { success, data }
        return response?.data || { items: [], total: 0, limit: query?.limit || 50, offset: query?.offset || 0 };
    }

    async getItemById(id: number): Promise<Item> {
        const response = await this.request<{ success: boolean; data: Item }>(`/items/${id}`);
        // Backend wraps response in { success, data }
        return response?.data as Item;
    }

    async getReadyItems(query?: GetReadyItemsQuery): Promise<{ items: ReadyItem[]; total: number; limit: number; offset: number }> {
        const params = new URLSearchParams();
        if (query?.sortBy) params.append('sortBy', query.sortBy);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());
        if (query?.sourceId) params.append('sourceId', query.sourceId.toString());
        if (query?.topicTag) params.append('topicTag', query.topicTag);
        if (query?.fromDate) params.append('fromDate', query.fromDate);
        if (query?.toDate) params.append('toDate', query.toDate);

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { items: ReadyItem[]; total: number; limit: number; offset: number; sortBy?: string } }>(`/items/ready${queryString ? `?${queryString}` : ''}`);

        // Backend wraps response in { success, data }
        return response?.data || { items: [], total: 0, limit: query?.limit || 20, offset: query?.offset || 0 };
    }

    async getItemsStats(): Promise<ItemsStats> {
        const result = await this.request<ItemsStats>('/items/stats');
        return result || {
            byStatus: {},
            recentCount: 0,
            filteredCount: 0,
            rejectedCount: 0,
            total: 0,
        };
    }

    async deleteItems(ids: number[]): Promise<{ deleted: number }> {
        const response = await this.request<{ success: boolean; data: { deleted: number } }>('/items', {
            method: 'DELETE',
            body: JSON.stringify({ ids }),
        });
        return response?.data || { deleted: 0 };
    }

    async deleteAllItems(): Promise<{ deleted: number }> {
        const response = await this.request<{ success: boolean; data: { deleted: number } }>('/items/all', {
            method: 'DELETE',
        });
        return response?.data || { deleted: 0 };
    }

    async deleteAllReadyItems(): Promise<{ deleted: number }> {
        const response = await this.request<{ success: boolean; data: { deleted: number } }>('/items/all/ready', {
            method: 'DELETE',
        });
        return response?.data || { deleted: 0 };
    }

    // Draft endpoints
    async getDrafts(query?: GetDraftsQuery): Promise<DailyPost[]> {
        const params = new URLSearchParams();
        if (query?.status) params.append('status', query.status);
        if (query?.targetDate) params.append('targetDate', query.targetDate);
        if (query?.timeSlot) params.append('timeSlot', query.timeSlot);

        const queryString = params.toString();
        const endpoint = queryString ? `/drafts?${queryString}` : '/drafts';

        const result = await this.request<DailyPost[]>(endpoint);
        return result || [];
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

    // Monitoring endpoints
    async getMonitoringOverview(): Promise<MonitoringOverview> {
        const response = await this.request<{ success: boolean; data: MonitoringOverview }>('/monitor/overview');

        // Backend wraps response in { success, data }
        if (!response?.data) {
            return {
                health: { overall: 'DOWN', services: [] },
                logs: { total: 0, byLevel: [], recentErrors: 0 },
                metrics: { total: 0, recentCount: 0 },
                traces: { total: 0, avgDuration: 0, slowCount: 0 },
                timestamp: new Date().toISOString(),
            };
        }
        return response.data;
    }

    async getLogs(query?: GetLogsQuery): Promise<{ logs: SystemLog[]; total: number; limit: number; offset: number }> {
        const params = new URLSearchParams();
        if (query?.level) params.append('level', query.level);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.traceId) params.append('traceId', query.traceId);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());
        if (query?.search) params.append('search', query.search);

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { logs: SystemLog[]; total: number; limit: number; offset: number } }>(`/monitor/logs${queryString ? `?${queryString}` : ''}`);
        return response?.data || { logs: [], total: 0, limit: query?.limit || 100, offset: query?.offset || 0 };
    }

    async getLogStats(startDate?: string, endDate?: string): Promise<LogStats[]> {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: LogStats[] }>(`/monitor/logs/stats${queryString ? `?${queryString}` : ''}`);
        return response?.data || [];
    }

    async getMetrics(query?: GetMetricsQuery): Promise<{ metrics: SystemMetric[]; total?: number }> {
        const params = new URLSearchParams();
        if (query?.name) params.append('name', query.name);
        if (query?.metric) params.append('metric', query.metric);
        if (query?.from) params.append('from', query.from);
        if (query?.to) params.append('to', query.to);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { metrics: SystemMetric[] } }>(`/monitor/metrics${queryString ? `?${queryString}` : ''}`);
        return response?.data || { metrics: [] };
    }

    async getMetricStats(name: string): Promise<MetricStats> {
        const response = await this.request<{ success: boolean; data: MetricStats }>(`/monitor/metrics/stats?name=${encodeURIComponent(name)}`);
        return response?.data || {
            name,
            count: 0,
            avg: 0,
            min: 0,
            max: 0,
            sum: 0,
        };
    }

    async getSystemMetrics(): Promise<Record<string, any>> {
        const response = await this.request<{ success: boolean; data: Record<string, any> }>('/monitor/metrics/system');
        return response?.data || {};
    }

    async getHealthStatus(): Promise<HealthStatus> {
        const response = await this.request<{ success: boolean; data: HealthStatus }>('/monitor/health');
        return response?.data || { overall: 'DOWN', services: [] };
    }

    async getHealthHistory(service?: string, limit?: number): Promise<HealthCheck[]> {
        const params = new URLSearchParams();
        if (service) params.append('service', service);
        if (limit) params.append('limit', limit.toString());

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: HealthCheck[] }>(`/monitor/health/history${queryString ? `?${queryString}` : ''}`);
        return response?.data || [];
    }

    async getTraces(query?: GetTracesQuery): Promise<{ traces: PerformanceTrace[] }> {
        const params = new URLSearchParams();
        if (query?.name) params.append('name', query.name);
        if (query?.minDuration) params.append('minDuration', query.minDuration.toString());
        if (query?.status) params.append('status', query.status);
        if (query?.startDate) params.append('startDate', query.startDate);
        if (query?.endDate) params.append('endDate', query.endDate);
        if (query?.limit) params.append('limit', query.limit.toString());
        if (query?.offset) params.append('offset', query.offset.toString());

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { traces: PerformanceTrace[] } }>(`/monitor/traces${queryString ? `?${queryString}` : ''}`);
        return response?.data || { traces: [] };
    }

    async getSlowTraces(threshold?: number, limit?: number): Promise<{ traces: PerformanceTrace[] }> {
        const params = new URLSearchParams();
        if (threshold) params.append('threshold', threshold.toString());
        if (limit) params.append('limit', limit.toString());

        const queryString = params.toString();
        const response = await this.request<{ success: boolean; data: { traces: PerformanceTrace[] } }>(`/monitor/traces/slow${queryString ? `?${queryString}` : ''}`);
        return response?.data || { traces: [] };
    }

    async getTraceStats(name: string): Promise<TraceStats> {
        const response = await this.request<{ success: boolean; data: TraceStats }>(`/monitor/traces/stats?name=${encodeURIComponent(name)}`);
        return response?.data || {
            name,
            count: 0,
            avgDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            p50: 0,
            p95: 0,
            p99: 0,
        };
    }

    async getTraceById(traceId: string): Promise<PerformanceTrace[]> {
        const response = await this.request<{ success: boolean; data: PerformanceTrace[] }>(`/monitor/traces/${traceId}`);
        return response?.data || [];
    }
}

export const apiClient = new ApiClient();
