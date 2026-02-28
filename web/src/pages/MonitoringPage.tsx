import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../lib/api-client';
import { SharedNav } from '../components/SharedNav';
import type { LogLevel, GetLogsQuery, GetMetricsQuery, GetTracesQuery } from '../types/api';

type Tab = 'overview' | 'logs' | 'metrics' | 'health' | 'traces';

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    trace: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    debug: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    info: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    warn: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    error: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    fatal: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
};

const HEALTH_STATUS_COLORS = {
    UP: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    DOWN: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    DEGRADED: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
};

export function MonitoringPage() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [logLevel, setLogLevel] = useState<LogLevel | 'ALL'>('ALL');
    const [metricName, setMetricName] = useState('');
    const [traceName, setTraceName] = useState('');
    const [minDuration, setMinDuration] = useState(1000);

    // Overview
    const { data: overview, isLoading: overviewLoading } = useQuery({
        queryKey: ['monitoring-overview'],
        queryFn: () => apiClient.getMonitoringOverview(),
        refetchInterval: 30000, // 30s
        enabled: activeTab === 'overview',
    });

    // Logs
    const logsQuery: GetLogsQuery = {
        level: logLevel !== 'ALL' ? logLevel : undefined,
        limit: 100,
    };

    const { data: logs } = useQuery({
        queryKey: ['monitoring-logs', logsQuery],
        queryFn: () => apiClient.getLogs(logsQuery),
        refetchInterval: 10000, // 10s
        enabled: activeTab === 'logs',
    });

    const { data: logStats } = useQuery({
        queryKey: ['monitoring-log-stats'],
        queryFn: () => apiClient.getLogStats(),
        refetchInterval: 30000,
        enabled: activeTab === 'logs',
    });

    // Metrics
    const metricsQuery: GetMetricsQuery = {
        name: metricName || undefined,
        limit: 100,
    };

    const { data: metrics } = useQuery({
        queryKey: ['monitoring-metrics', metricsQuery],
        queryFn: () => apiClient.getMetrics(metricsQuery),
        refetchInterval: 15000, // 15s
        enabled: activeTab === 'metrics',
    });

    const { data: systemMetrics } = useQuery({
        queryKey: ['monitoring-system-metrics'],
        queryFn: () => apiClient.getSystemMetrics(),
        refetchInterval: 5000, // 5s
        enabled: activeTab === 'metrics',
    });

    // Health
    const { data: healthStatus } = useQuery({
        queryKey: ['monitoring-health'],
        queryFn: () => apiClient.getHealthStatus(),
        refetchInterval: 10000, // 10s
        enabled: activeTab === 'health',
    });

    const { data: healthHistory } = useQuery({
        queryKey: ['monitoring-health-history'],
        queryFn: () => apiClient.getHealthHistory(undefined, 50),
        refetchInterval: 30000,
        enabled: activeTab === 'health',
    });

    // Traces
    const tracesQuery: GetTracesQuery = {
        name: traceName || undefined,
        minDuration,
        limit: 50,
    };

    const { data: traces } = useQuery({
        queryKey: ['monitoring-traces', tracesQuery],
        queryFn: () => apiClient.getTraces(tracesQuery),
        refetchInterval: 15000, // 15s
        enabled: activeTab === 'traces',
    });

    const { data: slowTraces } = useQuery({
        queryKey: ['monitoring-slow-traces'],
        queryFn: () => apiClient.getSlowTraces(5000),
        refetchInterval: 30000,
        enabled: activeTab === 'traces',
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <SharedNav />

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex gap-6">
                        {[
                            { id: 'overview', label: '📈 Overview', icon: '' },
                            { id: 'logs', label: '📝 Logs', icon: '' },
                            { id: 'metrics', label: '📊 Metrics', icon: '' },
                            { id: 'health', label: '💚 Health', icon: '' },
                            { id: 'traces', label: '⚡ Traces', icon: '' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {overviewLoading ? (
                            <div className="text-center py-12 text-gray-600 dark:text-gray-300">Đang tải...</div>
                        ) : overview && overview.health ? (
                            <>
                                {/* Health Status */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">System Health</h2>
                                    <div className="flex items-center gap-3 mb-4">
                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-semibold ${HEALTH_STATUS_COLORS[overview.health.overall]
                                                }`}
                                        >
                                            {overview.health.overall}
                                        </span>
                                        <span className="text-sm text-gray-600 dark:text-gray-300">
                                            {overview.timestamp}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {(overview.health.services || []).map((service) => (
                                            <div
                                                key={service.service}
                                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                            >
                                                <div className="font-medium text-gray-900 dark:text-white mb-2">
                                                    {service.service}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-0.5 rounded text-xs font-semibold ${HEALTH_STATUS_COLORS[service.status]
                                                            }`}
                                                    >
                                                        {service.status}
                                                    </span>
                                                    {service.responseTime && (
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {service.responseTime}ms
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Logs */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Logs (24h)
                                        </h3>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                            {(overview.logs?.total || 0).toLocaleString()}
                                        </div>
                                        <div className="space-y-1">
                                            {(overview.logs?.byLevel || []).map((stat) => (
                                                <div
                                                    key={stat.level}
                                                    className="flex justify-between text-sm"
                                                >
                                                    <span
                                                        className={`px-2 rounded ${LOG_LEVEL_COLORS[stat.level]
                                                            }`}
                                                    >
                                                        {stat.level}
                                                    </span>
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        {stat.count}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        {(overview.logs?.recentErrors || 0) > 0 && (
                                            <div className="mt-3 text-sm text-red-600">
                                                ⚠️ {overview.logs.recentErrors} recent errors
                                            </div>
                                        )}
                                    </div>

                                    {/* Metrics */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Metrics (24h)
                                        </h3>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                            {(overview.metrics?.total || 0).toLocaleString()}
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            Recent: {overview.metrics?.recentCount || 0} metrics
                                        </div>
                                    </div>

                                    {/* Traces */}
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            Performance (24h)
                                        </h3>
                                        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                                            {(overview.traces?.avgDuration || 0).toFixed(0)}ms
                                        </div>
                                        <div className="text-sm text-gray-600 dark:text-gray-300">
                                            {overview.traces?.total || 0} traces
                                        </div>
                                        {(overview.traces?.slowCount || 0) > 0 && (
                                            <div className="mt-2 text-sm text-yellow-600">
                                                ⚠️ {overview.traces.slowCount} slow requests
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                No overview data available
                            </div>
                        )}
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Level:
                                </label>
                                <select
                                    value={logLevel}
                                    onChange={(e) =>
                                        setLogLevel(e.target.value as LogLevel | 'ALL')
                                    }
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="ALL">All</option>
                                    <option value="trace">Trace</option>
                                    <option value="debug">Debug</option>
                                    <option value="info">Info</option>
                                    <option value="warn">Warning</option>
                                    <option value="error">Error</option>
                                    <option value="fatal">Fatal</option>
                                </select>

                                {Array.isArray(logStats) && logStats.length > 0 && (
                                    <div className="ml-auto flex gap-3">
                                        {logStats.map((stat) => (
                                            <div
                                                key={stat.level}
                                                className="flex items-center gap-2"
                                            >
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${LOG_LEVEL_COLORS[stat.level]
                                                        }`}
                                                >
                                                    {stat.level}
                                                </span>
                                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                                    {stat.count}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Logs Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Level
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Message
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Trace ID
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {logs && logs.length > 0 ? (
                                            logs.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(
                                                            log.timestamp
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-semibold ${LOG_LEVEL_COLORS[log.level]
                                                                }`}
                                                        >
                                                            {log.level}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-lg">
                                                        {log.message}
                                                        {log.meta && (
                                                            <details className="mt-1">
                                                                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer">
                                                                    Metadata
                                                                </summary>
                                                                <pre className="mt-1 text-xs bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded overflow-x-auto">
                                                                    {JSON.stringify(
                                                                        log.meta,
                                                                        null,
                                                                        2
                                                                    )}
                                                                </pre>
                                                            </details>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                                        {log.traceId || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No logs found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Metrics Tab */}
                {activeTab === 'metrics' && (
                    <div className="space-y-6">
                        {/* System Metrics */}
                        {systemMetrics && (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                {Object.entries(systemMetrics).map(([key, value]) => (
                                    <div key={key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                                            {key.replace(/_/g, ' ').toUpperCase()}
                                        </div>
                                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                            {typeof value === 'number'
                                                ? value.toFixed(2)
                                                : String(value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Metric Name:
                                </label>
                                <input
                                    type="text"
                                    value={metricName}
                                    onChange={(e) => setMetricName(e.target.value)}
                                    placeholder="Filter by metric name..."
                                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Metrics Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Value
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Unit
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Tags
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {metrics && metrics.length > 0 ? (
                                            metrics.map((metric) => (
                                                <tr key={metric.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(
                                                            metric.timestamp
                                                        ).toLocaleTimeString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {metric.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                                        {metric.value.toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {metric.unit || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {metric.tags &&
                                                            Object.entries(metric.tags)
                                                                .map(
                                                                    ([k, v]) =>
                                                                        `${k}=${v}`
                                                                )
                                                                .join(', ')}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No metrics found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Health Tab */}
                {activeTab === 'health' && (
                    <div className="space-y-6">
                        {/* Current Status */}
                        {healthStatus && (
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                                    Current Health Status
                                </h2>
                                <div className="flex items-center gap-3 mb-6">
                                    <span
                                        className={`px-4 py-2 rounded-full text-lg font-semibold ${HEALTH_STATUS_COLORS[healthStatus.overall]
                                            }`}
                                    >
                                        {healthStatus.overall}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {(healthStatus.services || []).map((service) => (
                                        <div
                                            key={service.service}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                                        >
                                            <div className="font-medium text-gray-900 dark:text-white mb-3">
                                                {service.service}
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-semibold ${HEALTH_STATUS_COLORS[service.status]
                                                            }`}
                                                    >
                                                        {service.status}
                                                    </span>
                                                </div>
                                                {service.responseTime && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                                        Response: {service.responseTime}ms
                                                    </div>
                                                )}
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    Last check:{' '}
                                                    {new Date(
                                                        service.lastCheck
                                                    ).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Health History */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Health Check History</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Service
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Response Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Message
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {healthHistory && healthHistory.length > 0 ? (
                                            healthHistory.map((check) => (
                                                <tr key={check.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(
                                                            check.timestamp
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {check.service}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-semibold ${HEALTH_STATUS_COLORS[check.status]
                                                                }`}
                                                        >
                                                            {check.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {check.responseTime
                                                            ? `${check.responseTime}ms`
                                                            : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                        {check.message || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No health check history
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Traces Tab */}
                {activeTab === 'traces' && (
                    <div className="space-y-6">
                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Name:
                                    </label>
                                    <input
                                        type="text"
                                        value={traceName}
                                        onChange={(e) => setTraceName(e.target.value)}
                                        placeholder="Filter by trace name..."
                                        className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Min Duration (ms):
                                    </label>
                                    <input
                                        type="number"
                                        value={minDuration}
                                        onChange={(e) =>
                                            setMinDuration(Number(e.target.value))
                                        }
                                        className="w-24 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Slow Traces Alert */}
                        {slowTraces && slowTraces.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                                <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">
                                    ⚠️ Slow Requests ({slowTraces.length})
                                </h3>
                                <div className="space-y-2">
                                    {slowTraces.slice(0, 5).map((trace) => (
                                        <div
                                            key={trace.id}
                                            className="text-sm text-yellow-800 dark:text-yellow-200"
                                        >
                                            <span className="font-mono">{trace.name}</span> -{' '}
                                            {trace.duration}ms
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Traces Table */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Duration
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                                Trace ID
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {traces && traces.length > 0 ? (
                                            traces.map((trace) => (
                                                <tr
                                                    key={trace.id}
                                                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${trace.duration > 5000
                                                        ? 'bg-yellow-50 dark:bg-yellow-900/10'
                                                        : ''
                                                        }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                                        {new Date(
                                                            trace.timestamp
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                                        {trace.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <span
                                                            className={
                                                                trace.duration > 5000
                                                                    ? 'text-red-600 dark:text-red-400 font-semibold'
                                                                    : trace.duration > 1000
                                                                        ? 'text-yellow-600 dark:text-yellow-400'
                                                                        : 'text-gray-900 dark:text-white'
                                                            }
                                                        >
                                                            {trace.duration}ms
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 rounded text-xs font-semibold ${trace.status === 'success'
                                                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                                                                }`}
                                                        >
                                                            {trace.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                                        {trace.traceId.substring(0, 16)}...
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No traces found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
