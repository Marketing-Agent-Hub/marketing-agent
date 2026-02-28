import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { CreateSourceInput } from '../types/api';

interface ImportSourcesModalProps {
    onClose: () => void;
}

interface ImportResult {
    success: number;
    failed: number;
    errors: Array<{ index: number; name: string; error: string }>;
}

export function ImportSourcesModal({ onClose }: ImportSourcesModalProps) {
    const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
    const [jsonText, setJsonText] = useState('');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const queryClient = useQueryClient();

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setJsonText(text);
        };
        reader.readAsText(file);
    };

    const validateAndParseJson = (text: string): CreateSourceInput[] | null => {
        try {
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                alert('❌ JSON phải là một mảng (array) các nguồn RSS');
                return null;
            }

            // Validate each source has required fields
            for (let i = 0; i < data.length; i++) {
                const source = data[i];
                if (!source.name || typeof source.name !== 'string') {
                    alert(`❌ Nguồn thứ ${i + 1} thiếu trường "name" (string)`);
                    return null;
                }
                if (!source.rssUrl || typeof source.rssUrl !== 'string') {
                    alert(`❌ Nguồn thứ ${i + 1} thiếu trường "rssUrl" (string)`);
                    return null;
                }
            }

            return data as CreateSourceInput[];
        } catch (error) {
            alert(`❌ JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    };

    const handleImport = async () => {
        if (!jsonText.trim()) {
            alert('⚠️ Vui lòng nhập hoặc tải lên dữ liệu JSON');
            return;
        }

        const sources = validateAndParseJson(jsonText);
        if (!sources) return;

        setImporting(true);
        setResult(null);

        const importResult: ImportResult = {
            success: 0,
            failed: 0,
            errors: [],
        };

        for (let i = 0; i < sources.length; i++) {
            try {
                await apiClient.createSource(sources[i]);
                importResult.success++;
            } catch (error) {
                importResult.failed++;
                importResult.errors.push({
                    index: i + 1,
                    name: sources[i].name,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        setResult(importResult);
        setImporting(false);
        queryClient.invalidateQueries({ queryKey: ['sources'] });
    };

    const handleClose = () => {
        if (importing) {
            alert('⚠️ Đang import, vui lòng đợi...');
            return;
        }
        onClose();
    };

    const exampleJson = [
        {
            name: "EdTech News",
            rssUrl: "https://example.com/rss",
            siteUrl: "https://example.com",
            lang: "EN",
            topicTags: ["education", "technology"],
            trustScore: 8,
            enabled: true,
            fetchIntervalMinutes: 15,
            denyKeywords: ["spam", "ads"],
            notes: "Quality education technology news source"
        },
        {
            name: "Blockchain Education",
            rssUrl: "https://example2.com/feed",
            lang: "VI",
            topicTags: ["blockchain", "web3"],
            trustScore: 7
        }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-8 border border-gray-200 dark:border-gray-700 w-full max-w-4xl shadow-lg rounded-lg bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                            📥 Import Nguồn RSS
                        </h3>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 text-xl w-6 h-6 rounded-full border-2 border-gray-400 hover:border-gray-600 dark:border-gray-500 dark:hover:border-gray-400 flex items-center justify-center font-bold"
                            title="Xem hướng dẫn"
                        >
                            ?
                        </button>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 text-3xl font-bold"
                    >
                        ×
                    </button>
                </div>

                {/* Help Panel */}
                {showHelp && (
                    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">📖 Hướng dẫn định dạng JSON</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                            JSON phải là một <strong>mảng (array)</strong> chứa các object nguồn RSS. Mỗi nguồn cần có:
                        </p>
                        <div className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                            <strong>Trường bắt buộc:</strong>
                            <ul className="list-disc ml-5 mt-1">
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">name</code>: Tên nguồn (string)</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">rssUrl</code>: URL RSS feed (string)</li>
                            </ul>
                        </div>
                        <div className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                            <strong>Trường tùy chọn:</strong>
                            <ul className="list-disc ml-5 mt-1">
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">siteUrl</code>: URL trang web (string)</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">lang</code>: Ngôn ngữ - "VI" | "EN" | "MIXED" (mặc định: "EN")</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">topicTags</code>: Mảng tags (string[], ví dụ: ["education", "blockchain"])</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">trustScore</code>: Điểm tin cậy 1-10 (number, mặc định: 5)</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">enabled</code>: Kích hoạt hay không (boolean, mặc định: true)</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">fetchIntervalMinutes</code>: Khoảng thời gian fetch (number, mặc định: 15)</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">denyKeywords</code>: Mảng từ khóa chặn (string[])</li>
                                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">notes</code>: Ghi chú (string)</li>
                            </ul>
                        </div>
                        <div className="text-sm">
                            <strong className="text-blue-900 dark:text-blue-300">Ví dụ:</strong>
                            <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-green-400 rounded overflow-x-auto text-xs">
                                {JSON.stringify(exampleJson, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                        onClick={() => setActiveTab('file')}
                        className={`px-6 py-2 font-medium ${activeTab === 'file'
                            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                    >
                        📄 Upload File
                    </button>
                    <button
                        onClick={() => setActiveTab('paste')}
                        className={`px-6 py-2 font-medium ${activeTab === 'paste'
                            ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                    >
                        📋 Paste JSON
                    </button>
                </div>

                {/* Tab Content */}
                <div className="mb-6">
                    {activeTab === 'file' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Chọn file JSON
                            </label>
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileUpload}
                                disabled={importing}
                                className="block w-full text-sm text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none p-2"
                            />
                            {jsonText && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Preview:
                                    </label>
                                    <textarea
                                        value={jsonText}
                                        onChange={(e) => setJsonText(e.target.value)}
                                        disabled={importing}
                                        className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Dán JSON vào đây
                            </label>
                            <textarea
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                                disabled={importing}
                                placeholder='[{"name": "Source Name", "rssUrl": "https://..."}]'
                                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-lg font-mono text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    )}
                </div>

                {/* Import Result */}
                {result && (
                    <div className={`mb-6 p-4 rounded-lg ${result.failed === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                        }`}>
                        <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">
                            {result.failed === 0 ? '✅ Import thành công!' : '⚠️ Import hoàn tất với lỗi'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            ✅ Thành công: {result.success} nguồn
                            {result.failed > 0 && ` | ❌ Thất bại: ${result.failed} nguồn`}
                        </p>
                        {result.errors.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Chi tiết lỗi:</p>
                                <ul className="text-xs space-y-1">
                                    {result.errors.map((err, i) => (
                                        <li key={i} className="text-red-700 dark:text-red-400">
                                            #{err.index} "{err.name}": {err.error}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        disabled={importing}
                        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                        {result ? 'Đóng' : 'Hủy'}
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !jsonText.trim()}
                        className="px-6 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? '⏳ Đang import...' : '📥 Import'}
                    </button>
                </div>
            </div>
        </div>
    );
}
