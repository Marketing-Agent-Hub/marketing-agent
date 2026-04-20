import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type AuthType = 'none' | 'product' | 'admin';

type Endpoint = {
    name: string;
    method: Method;
    path: string;
    auth?: AuthType;
    description?: string;
    query?: Array<{ key: string; value: string; description?: string }>;
    body?: unknown;
};

const collectionName = 'Marketing Agent Server API';
const outputDir = path.resolve(process.cwd(), 'postman');
const outputFile = path.join(outputDir, 'marketing-agent.postman_collection.json');

const defaultHeaders = [{ key: 'Content-Type', value: 'application/json' }];

const rawBody = (body: unknown) =>
    body === undefined
        ? undefined
        : {
            mode: 'raw',
            raw: JSON.stringify(body, null, 2),
            options: {
                raw: {
                    language: 'json',
                },
            },
        };

const withAuth = (auth: AuthType | undefined) => {
    if (!auth || auth === 'none') {
        return undefined;
    }

    const tokenVar = auth === 'admin' ? '{{adminToken}}' : '{{productToken}}';
    return {
        type: 'bearer',
        bearer: [{ key: 'token', value: tokenVar, type: 'string' }],
    };
};

const toItem = (endpoint: Endpoint) => {
    const cleanPath = endpoint.path.replace(/^\/+/, '');
    const segments = cleanPath.split('/');
    const query = endpoint.query?.map(item => ({
        key: item.key,
        value: item.value,
        description: item.description,
    }));

    return {
        name: endpoint.name,
        request: {
            method: endpoint.method,
            header: endpoint.body === undefined ? [] : defaultHeaders,
            auth: withAuth(endpoint.auth),
            description: endpoint.description,
            body: rawBody(endpoint.body),
            url: {
                raw: `{{baseUrl}}/${cleanPath}`,
                host: ['{{baseUrl}}'],
                path: segments,
                query,
            },
        },
        response: [],
    };
};

const groups: Array<{ name: string; items: Endpoint[] }> = [
    {
        name: 'Health',
        items: [
            { name: 'API Health', method: 'GET', path: '/api/health', auth: 'none' },
            { name: 'Product Health', method: 'GET', path: '/api/product-health', auth: 'none' },
            { name: 'Internal Health', method: 'GET', path: '/api/internal/health', auth: 'none' },
        ],
    },
    {
        name: 'Product Auth',
        items: [
            {
                name: 'Register',
                method: 'POST',
                path: '/api/accounts/register',
                auth: 'none',
                body: { email: 'user@example.com', password: 'password123', name: 'Demo User' },
            },
            {
                name: 'Login',
                method: 'POST',
                path: '/api/accounts/login',
                auth: 'none',
                body: { email: 'user@example.com', password: 'password123' },
            },
            { name: 'Get Me', method: 'GET', path: '/api/accounts/me', auth: 'product' },
            {
                name: 'Google Sign In',
                method: 'POST',
                path: '/api/accounts/auth/google',
                auth: 'none',
                body: { idToken: 'google-id-token' },
            },
            {
                name: 'Request Magic Link',
                method: 'POST',
                path: '/api/accounts/auth/magic-link/request',
                auth: 'none',
                body: { email: 'user@example.com' },
            },
            {
                name: 'Verify Magic Link',
                method: 'GET',
                path: '/api/accounts/auth/magic-link/verify',
                auth: 'none',
                query: [{ key: 'token', value: '{{magicLinkToken}}' }],
            },
        ],
    },
    {
        name: 'Workspaces',
        items: [
            { name: 'List Workspaces', method: 'GET', path: '/api/workspaces', auth: 'product' },
            {
                name: 'Create Workspace',
                method: 'POST',
                path: '/api/workspaces',
                auth: 'product',
                body: { name: 'Demo Workspace', slug: 'demo-workspace' },
            },
            { name: 'Get Workspace', method: 'GET', path: '/api/workspaces/{{workspaceId}}', auth: 'product' },
            {
                name: 'Add Workspace Member',
                method: 'POST',
                path: '/api/workspaces/{{workspaceId}}/members',
                auth: 'product',
                body: { userId: 2, role: 'EDITOR' },
            },
        ],
    },
    {
        name: 'Brands',
        items: [
            { name: 'List Brands In Workspace', method: 'GET', path: '/api/workspaces/{{workspaceId}}/brands', auth: 'product' },
            {
                name: 'Create Brand',
                method: 'POST',
                path: '/api/workspaces/{{workspaceId}}/brands',
                auth: 'product',
                body: {
                    name: 'Demo Brand',
                    websiteUrl: 'https://example.com',
                    industry: 'Media',
                    timezone: 'Asia/Saigon',
                    defaultLanguage: 'vi',
                },
            },
            { name: 'Get Brand', method: 'GET', path: '/api/brands/{{brandId}}', auth: 'product' },
            {
                name: 'Update Brand',
                method: 'PATCH',
                path: '/api/brands/{{brandId}}',
                auth: 'product',
                body: {
                    name: 'Updated Brand',
                    websiteUrl: 'https://example.com',
                    industry: 'Marketing',
                    timezone: 'Asia/Saigon',
                    defaultLanguage: 'vi',
                },
            },
            {
                name: 'Add Knowledge Document',
                method: 'POST',
                path: '/api/brands/{{brandId}}/knowledge-documents',
                auth: 'product',
                body: {
                    title: 'Brand Voice Guide',
                    content: 'Always sound concise and helpful.',
                    sourceUrl: 'https://example.com/guide',
                    docType: 'GUIDE',
                },
            },
        ],
    },
    {
        name: 'Onboarding',
        items: [
            { name: 'Create Onboarding Session', method: 'POST', path: '/api/brands/{{brandId}}/onboarding/sessions', auth: 'product', body: {} },
            { name: 'Get Onboarding Session', method: 'GET', path: '/api/brands/{{brandId}}/onboarding/sessions/{{sessionId}}', auth: 'product' },
            {
                name: 'Add Onboarding Message',
                method: 'POST',
                path: '/api/brands/{{brandId}}/onboarding/sessions/{{sessionId}}/messages',
                auth: 'product',
                body: { role: 'user', content: 'Brand targets B2B SaaS founders.' },
            },
            {
                name: 'Complete Onboarding Session',
                method: 'POST',
                path: '/api/brands/{{brandId}}/onboarding/sessions/{{sessionId}}/complete',
                auth: 'product',
                body: {},
            },
        ],
    },
    {
        name: 'Strategies',
        items: [
            {
                name: 'Generate Strategy',
                method: 'POST',
                path: '/api/brands/{{brandId}}/strategies/generate',
                auth: 'product',
                body: {
                    durationDays: 30,
                    startDate: '2026-04-16T00:00:00.000Z',
                    channels: ['FACEBOOK', 'INSTAGRAM'],
                    postsPerWeek: 5,
                },
            },
            { name: 'List Strategies', method: 'GET', path: '/api/brands/{{brandId}}/strategies', auth: 'product' },
            { name: 'Get Strategy', method: 'GET', path: '/api/strategies/{{strategyId}}', auth: 'product' },
            { name: 'Activate Strategy', method: 'POST', path: '/api/strategies/{{strategyId}}/activate', auth: 'product', body: {} },
            { name: 'List Strategy Slots', method: 'GET', path: '/api/strategies/{{strategyId}}/slots', auth: 'product' },
        ],
    },
    {
        name: 'Content',
        items: [
            {
                name: 'Generate Daily Content',
                method: 'POST',
                path: '/api/brands/{{brandId}}/content/generate-daily',
                auth: 'product',
                body: { daysAhead: 3 },
            },
            {
                name: 'List Briefs Via Content Alias',
                method: 'GET',
                path: '/api/brands/{{brandId}}/content/briefs',
                auth: 'product',
                query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
            },
            {
                name: 'List Briefs Via Briefs Alias',
                method: 'GET',
                path: '/api/brands/{{brandId}}/briefs/briefs',
                auth: 'product',
                query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
            },
            { name: 'Get Review Queue Via Content Alias', method: 'GET', path: '/api/brands/{{brandId}}/content/review-queue', auth: 'product' },
            { name: 'Get Review Queue Via Review Queue Alias', method: 'GET', path: '/api/brands/{{brandId}}/review-queue/review-queue', auth: 'product' },
            { name: 'Get Brief', method: 'GET', path: '/api/briefs/{{briefId}}', auth: 'product' },
            { name: 'Regenerate Drafts', method: 'POST', path: '/api/briefs/{{briefId}}/drafts/regenerate', auth: 'product', body: {} },
            {
                name: 'Edit Draft',
                method: 'PATCH',
                path: '/api/drafts/{{draftId}}',
                auth: 'product',
                body: {
                    body: 'Updated draft body',
                    hook: 'A stronger hook',
                    cta: 'Learn more',
                    hashtags: ['#marketing', '#ai'],
                },
            },
            { name: 'Approve Draft', method: 'POST', path: '/api/drafts/{{draftId}}/approve', auth: 'product', body: { comment: 'Looks good' } },
            { name: 'Reject Draft', method: 'POST', path: '/api/drafts/{{draftId}}/reject', auth: 'product', body: { comment: 'Please revise the tone' } },
        ],
    },
    {
        name: 'Brand Sources',
        items: [
            {
                name: 'Subscribe Brand To Source',
                method: 'POST',
                path: '/api/brands/{{brandId}}/sources',
                auth: 'product',
                body: { sourceId: 1, fetchIntervalMinutes: 60, enabled: true },
            },
            { name: 'List Brand Sources', method: 'GET', path: '/api/brands/{{brandId}}/sources', auth: 'product' },
            {
                name: 'Update Brand Source Overrides',
                method: 'PATCH',
                path: '/api/brands/{{brandId}}/sources/{{sourceId}}',
                auth: 'product',
                body: { fetchIntervalMinutes: 120, enabled: true },
            },
            { name: 'Unsubscribe Brand Source', method: 'DELETE', path: '/api/brands/{{brandId}}/sources/{{sourceId}}', auth: 'product' },
        ],
    },
    {
        name: 'Filter Profile',
        items: [
            { name: 'Get Filter Profile', method: 'GET', path: '/api/brands/{{brandId}}/filter-profile', auth: 'product' },
            {
                name: 'Upsert Filter Profile',
                method: 'PUT',
                path: '/api/brands/{{brandId}}/filter-profile',
                auth: 'product',
                body: {
                    mode: 'AI_EMBEDDING',
                    topicTags: ['marketing', 'ai'],
                    description: 'Only keep posts relevant to AI marketing and automation.',
                    similarityThreshold: 0.7,
                },
            },
            {
                name: 'Test Filter Profile',
                method: 'POST',
                path: '/api/brands/{{brandId}}/filter-profile/test',
                auth: 'product',
                body: {
                    title: '10 AI marketing workflows that save time',
                    filterProfile: {
                        mode: 'AI_EMBEDDING',
                        topicTags: ['marketing', 'ai'],
                        description: 'Only keep posts relevant to AI marketing and automation.',
                        similarityThreshold: 0.7,
                    },
                },
            },
        ],
    },
    {
        name: 'Job Schedules',
        items: [
            { name: 'List Brand Job Schedules', method: 'GET', path: '/api/brands/{{brandId}}/job-schedules', auth: 'product' },
            {
                name: 'Upsert Brand Job Schedule',
                method: 'PUT',
                path: '/api/brands/{{brandId}}/job-schedules/{{jobType}}',
                auth: 'product',
                body: { cronExpression: '0 * * * *', intervalMinutes: 60, enabled: true },
            },
            { name: 'Reset Brand Job Schedule To Default', method: 'DELETE', path: '/api/brands/{{brandId}}/job-schedules/{{jobType}}', auth: 'product' },
            { name: 'List Default Job Schedules', method: 'GET', path: '/api/internal/admin/job-schedules/defaults', auth: 'admin' },
            {
                name: 'Update Default Job Schedule',
                method: 'PUT',
                path: '/api/internal/admin/job-schedules/defaults/{{jobType}}',
                auth: 'admin',
                body: { cronExpression: '0 */6 * * *' },
            },
        ],
    },
    {
        name: 'Publishing',
        items: [
            { name: 'List Publish Jobs', method: 'GET', path: '/api/brands/{{brandId}}/publish-jobs', auth: 'product' },
            {
                name: 'Schedule Draft',
                method: 'POST',
                path: '/api/drafts/{{draftId}}/schedule',
                auth: 'product',
                body: { scheduledFor: '2026-04-17T08:00:00.000Z' },
            },
            { name: 'Retry Publish Job', method: 'POST', path: '/api/publish-jobs/{{publishJobId}}/retry', auth: 'product', body: {} },
        ],
    },
    {
        name: 'Social Accounts',
        items: [
            { name: 'List Social Accounts', method: 'GET', path: '/api/brands/{{brandId}}/social-accounts', auth: 'product' },
            {
                name: 'Connect Social Account',
                method: 'POST',
                path: '/api/brands/{{brandId}}/social-accounts/connect',
                auth: 'product',
                body: {
                    platform: 'FACEBOOK',
                    accountName: 'Demo Page',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    expiresAt: '2026-04-17T08:00:00.000Z',
                },
            },
            { name: 'Disconnect Social Account', method: 'POST', path: '/api/social-accounts/{{socialAccountId}}/disconnect', auth: 'product', body: {} },
        ],
    },
    {
        name: 'Trends',
        items: [
            { name: 'List Brand Trends', method: 'GET', path: '/api/brands/{{brandId}}/trends', auth: 'product' },
            { name: 'Refresh Brand Trends', method: 'POST', path: '/api/brands/{{brandId}}/trends/refresh', auth: 'product', body: {} },
            { name: 'Internal List Brand Trends', method: 'GET', path: '/api/internal/brands/{{brandId}}/trends', auth: 'product' },
            { name: 'Internal Match Brand Trends', method: 'POST', path: '/api/internal/brands/{{brandId}}/trends/match', auth: 'product', body: {} },
        ],
    },
    {
        name: 'Pipeline',
        items: [
            { name: 'Get Agent Config', method: 'GET', path: '/api/brands/{{brandId}}/agent-config', auth: 'product' },
            {
                name: 'Upsert Agent Config',
                method: 'PUT',
                path: '/api/brands/{{brandId}}/agent-config',
                auth: 'product',
                body: {
                    enableSocialPostAgent: true,
                    enableVideoAgent: true,
                    enableLongformAgent: false,
                    curatorModel: 'openai/gpt-4.1-mini',
                    screenwriterModel: 'openai/gpt-4.1-mini',
                    socialPostMaxChars: 280,
                    socialPostIncludeHashtags: true,
                    socialPostIncludeEmoji: false,
                    enableImageForSocialPost: false,
                },
            },
            { name: 'Get Drafts By Item', method: 'GET', path: '/api/items/{{itemId}}/drafts', auth: 'product' },
            { name: 'Get Script By Script ID', method: 'GET', path: '/api/scripts/{{scriptId}}', auth: 'product' },
            { name: 'List OpenRouter Models', method: 'GET', path: '/api/models', auth: 'product' },
        ],
    },
    {
        name: 'Internal Admin',
        items: [
            { name: 'Admin Auth Check', method: 'GET', path: '/api/internal/auth-check', auth: 'admin' },
            { name: 'Get AI Settings', method: 'GET', path: '/api/internal/admin/ai/settings', auth: 'admin' },
            {
                name: 'Patch AI Settings',
                method: 'PATCH',
                path: '/api/internal/admin/ai/settings',
                auth: 'admin',
                body: {
                    models: {
                        stageA: 'openai/gpt-4.1-mini',
                        stageB: 'openai/gpt-4.1',
                        embedding: 'text-embedding-3-small',
                    },
                    stages: { stageA: { enabled: true }, stageB: { enabled: true } },
                },
            },
            { name: 'Admin Trigger Ingest', method: 'POST', path: '/api/internal/admin/ingest/trigger', auth: 'admin', body: {} },
            { name: 'Admin Trigger Extraction', method: 'POST', path: '/api/internal/admin/extraction/trigger', auth: 'admin', body: { limit: 10 } },
            { name: 'Admin Trigger Filtering', method: 'POST', path: '/api/internal/admin/filtering/trigger', auth: 'admin', body: { limit: 20 } },
            { name: 'Admin Trigger AI Stage A', method: 'POST', path: '/api/internal/admin/ai/stage-a/trigger', auth: 'admin', body: { limit: 5 } },
            { name: 'Admin Trigger AI Stage B', method: 'POST', path: '/api/internal/admin/ai/stage-b/trigger', auth: 'admin', body: { limit: 3 } },
            { name: 'Run Ingest Job', method: 'POST', path: '/api/internal/content-intelligence/jobs/ingest/run', auth: 'admin', body: { limit: 10 } },
            { name: 'Run Extraction Job', method: 'POST', path: '/api/internal/content-intelligence/jobs/extraction/run', auth: 'admin', body: { limit: 20 } },
            { name: 'Run Filtering Job', method: 'POST', path: '/api/internal/content-intelligence/jobs/filtering/run', auth: 'admin', body: { limit: 20 } },
            { name: 'Run AI Stage A Job', method: 'POST', path: '/api/internal/content-intelligence/jobs/ai-stage-a/run', auth: 'admin', body: { limit: 5 } },
            { name: 'Run AI Stage B Job', method: 'POST', path: '/api/internal/content-intelligence/jobs/ai-stage-b/run', auth: 'admin', body: { limit: 3 } },
            { name: 'Refresh Trend Signals', method: 'POST', path: '/api/internal/content-intelligence/trends/refresh', auth: 'admin', body: {} },
        ],
    },
    {
        name: 'Internal Sources',
        items: [
            {
                name: 'List Sources',
                method: 'GET',
                path: '/api/internal/sources',
                auth: 'admin',
                query: [
                    { key: 'limit', value: '20' },
                    { key: 'offset', value: '0' },
                    { key: 'search', value: '' },
                    { key: 'enabled', value: 'true' },
                    { key: 'lang', value: 'VI' },
                    { key: 'minTrustScore', value: '50' },
                    { key: 'sortBy', value: 'enabled' },
                    { key: 'sortOrder', value: 'desc' },
                ],
            },
            { name: 'Export Sources', method: 'GET', path: '/api/internal/sources/export', auth: 'admin' },
            { name: 'Validate RSS URL', method: 'POST', path: '/api/internal/sources/validate', auth: 'admin', body: { url: 'https://example.com/rss.xml' } },
            {
                name: 'Create Source',
                method: 'POST',
                path: '/api/internal/sources',
                auth: 'admin',
                body: {
                    name: 'Example RSS',
                    rssUrl: 'https://example.com/rss.xml',
                    siteUrl: 'https://example.com',
                    lang: 'VI',
                    topicTags: ['tech', 'ai'],
                    trustScore: 80,
                    enabled: true,
                    fetchIntervalMinutes: 60,
                    denyKeywords: ['rumor'],
                    notes: 'Primary source',
                    type: 'RSS',
                    config: {},
                },
            },
            { name: 'Get Source By ID', method: 'GET', path: '/api/internal/sources/{{sourceId}}', auth: 'admin' },
            { name: 'Validate Source Plugin Config', method: 'POST', path: '/api/internal/sources/{{sourceId}}/validate-config', auth: 'admin', body: {} },
            {
                name: 'Update Source',
                method: 'PATCH',
                path: '/api/internal/sources/{{sourceId}}',
                auth: 'admin',
                body: { enabled: false, fetchIntervalMinutes: 120, denyKeywords: ['spoiler'] },
            },
            { name: 'Delete Source', method: 'DELETE', path: '/api/internal/sources/{{sourceId}}', auth: 'admin' },
        ],
    },
    {
        name: 'Internal Items',
        items: [
            {
                name: 'List Items',
                method: 'GET',
                path: '/api/internal/items',
                auth: 'admin',
                query: [
                    { key: 'status', value: 'NEW' },
                    { key: 'sourceId', value: '1' },
                    { key: 'limit', value: '50' },
                    { key: 'offset', value: '0' },
                    { key: 'search', value: '' },
                ],
            },
            {
                name: 'List Ready Items',
                method: 'GET',
                path: '/api/internal/items/ready',
                auth: 'admin',
                query: [
                    { key: 'limit', value: '20' },
                    { key: 'offset', value: '0' },
                    { key: 'sortBy', value: 'importance' },
                    { key: 'sourceId', value: '1' },
                    { key: 'topicTag', value: 'ai' },
                    { key: 'fromDate', value: '2026-04-01' },
                    { key: 'toDate', value: '2026-04-16' },
                ],
            },
            { name: 'Get Item Stats', method: 'GET', path: '/api/internal/items/stats', auth: 'admin' },
            { name: 'Get Item By ID', method: 'GET', path: '/api/internal/items/{{itemId}}', auth: 'admin' },
            { name: 'Delete All Items', method: 'DELETE', path: '/api/internal/items/all', auth: 'admin' },
            { name: 'Delete All Ready Items', method: 'DELETE', path: '/api/internal/items/all/ready', auth: 'admin' },
            { name: 'Delete Selected Items', method: 'DELETE', path: '/api/internal/items', auth: 'admin', body: { ids: [1, 2, 3] } },
        ],
    },
    {
        name: 'Source Discovery',
        items: [
            {
                name: 'List Pending Sources',
                method: 'GET',
                path: '/api/internal/source-discovery/pending',
                auth: 'admin',
                query: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }, { key: 'status', value: 'PENDING' }],
            },
            {
                name: 'Approve Pending Source',
                method: 'POST',
                path: '/api/internal/source-discovery/pending/{{pendingSourceId}}/approve',
                auth: 'admin',
                body: { name: 'Approved Source', trustScore: 75, topicTags: ['news', 'ai'], denyKeywords: ['spam'] },
            },
            {
                name: 'Reject Pending Source',
                method: 'POST',
                path: '/api/internal/source-discovery/pending/{{pendingSourceId}}/reject',
                auth: 'admin',
                body: { rejectionReason: 'Source quality too low' },
            },
            { name: 'Run Source Discovery Job', method: 'POST', path: '/api/internal/source-discovery/jobs/run', auth: 'admin', body: {} },
        ],
    },
    {
        name: 'Monitoring',
        items: [
            { name: 'Monitoring Overview', method: 'GET', path: '/api/internal/monitor/overview', auth: 'admin' },
            {
                name: 'Get Logs',
                method: 'GET',
                path: '/api/internal/monitor/logs',
                auth: 'admin',
                query: [
                    { key: 'level', value: 'ERROR' },
                    { key: 'service', value: 'server' },
                    { key: 'limit', value: '100' },
                    { key: 'offset', value: '0' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            { name: 'Get Log Stats', method: 'GET', path: '/api/internal/monitor/logs/stats', auth: 'admin' },
            {
                name: 'Get Metrics',
                method: 'GET',
                path: '/api/internal/monitor/metrics',
                auth: 'admin',
                query: [
                    { key: 'name', value: 'http_requests_total' },
                    { key: 'type', value: 'COUNTER' },
                    { key: 'limit', value: '100' },
                    { key: 'offset', value: '0' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            {
                name: 'Get Metric Stats',
                method: 'GET',
                path: '/api/internal/monitor/metrics/stats',
                auth: 'admin',
                query: [
                    { key: 'name', value: 'http_requests_total' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            { name: 'Get System Metrics', method: 'GET', path: '/api/internal/monitor/metrics/system', auth: 'admin' },
            { name: 'Get Health Status', method: 'GET', path: '/api/internal/monitor/health', auth: 'admin' },
            {
                name: 'Get Health History',
                method: 'GET',
                path: '/api/internal/monitor/health/history',
                auth: 'admin',
                query: [
                    { key: 'service', value: 'database' },
                    { key: 'limit', value: '100' },
                    { key: 'offset', value: '0' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            {
                name: 'Get Traces',
                method: 'GET',
                path: '/api/internal/monitor/traces',
                auth: 'admin',
                query: [
                    { key: 'traceId', value: '' },
                    { key: 'name', value: 'GET /api/health' },
                    { key: 'limit', value: '100' },
                    { key: 'offset', value: '0' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                    { key: 'minDuration', value: '0' },
                ],
            },
            {
                name: 'Get Slow Traces',
                method: 'GET',
                path: '/api/internal/monitor/traces/slow',
                auth: 'admin',
                query: [
                    { key: 'threshold', value: '5000' },
                    { key: 'limit', value: '50' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            {
                name: 'Get Trace Stats',
                method: 'GET',
                path: '/api/internal/monitor/traces/stats',
                auth: 'admin',
                query: [
                    { key: 'name', value: 'GET /api/health' },
                    { key: 'startDate', value: '2026-04-16T00:00:00.000Z' },
                    { key: 'endDate', value: '2026-04-16T23:59:59.999Z' },
                ],
            },
            { name: 'Get Trace By ID', method: 'GET', path: '/api/internal/monitor/traces/{{traceId}}', auth: 'admin' },
        ],
    },
];

const collection = {
    info: {
        name: collectionName,
        _postman_id: '4b065415-f981-4dbb-aefc-f3c179cb6cb4',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: 'Generated from Express route and schema inspection in source code.',
    },
    variable: [
        { key: 'baseUrl', value: 'http://localhost:3001', type: 'string' },
        { key: 'productToken', value: '', type: 'string' },
        { key: 'adminToken', value: '', type: 'string' },
        { key: 'workspaceId', value: '1', type: 'string' },
        { key: 'brandId', value: '1', type: 'string' },
        { key: 'sessionId', value: '1', type: 'string' },
        { key: 'strategyId', value: '1', type: 'string' },
        { key: 'briefId', value: '1', type: 'string' },
        { key: 'draftId', value: '1', type: 'string' },
        { key: 'sourceId', value: '1', type: 'string' },
        { key: 'itemId', value: '1', type: 'string' },
        { key: 'scriptId', value: 'script_123', type: 'string' },
        { key: 'socialAccountId', value: '1', type: 'string' },
        { key: 'publishJobId', value: '1', type: 'string' },
        { key: 'pendingSourceId', value: '1', type: 'string' },
        { key: 'traceId', value: 'trace_123', type: 'string' },
        { key: 'magicLinkToken', value: '', type: 'string' },
        { key: 'jobType', value: 'INGEST', type: 'string' },
    ],
    item: groups.map(group => ({ name: group.name, item: group.items.map(toItem) })),
};

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');

console.log(`Postman collection generated: ${outputFile}`);
