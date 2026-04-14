import { useState } from 'react';

interface JsonViewerProps {
    data: unknown;
}

function highlight(json: string): string {
    return json
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            (match) => {
                let cls = 'text-yellow-300'; // number
                if (/^"/.test(match)) {
                    cls = /:$/.test(match) ? 'text-[#4FACFE]' : 'text-green-300'; // key or string
                } else if (/true|false/.test(match)) {
                    cls = 'text-purple-300';
                } else if (/null/.test(match)) {
                    cls = 'text-red-300';
                }
                return `<span class="${cls}">${match}</span>`;
            }
        );
}

export default function JsonViewer({ data }: JsonViewerProps) {
    const [copied, setCopied] = useState(false);
    const json = JSON.stringify(data, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(json).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="relative rounded-lg border border-[var(--color-border)] bg-black/40 p-4 font-mono text-xs">
            <button
                onClick={handleCopy}
                className="absolute right-3 top-3 rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
                {copied ? 'Copied!' : 'Copy'}
            </button>
            <pre
                className="overflow-auto text-[var(--color-text)]"
                dangerouslySetInnerHTML={{ __html: highlight(json) }}
            />
        </div>
    );
}
