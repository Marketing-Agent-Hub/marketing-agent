// Table of Contents component
import { useEffect, useState } from 'react';
import { extractToc, type TocItem } from '../../lib/docs/registry';
import { cn } from '../../lib/utils';

interface DocsTOCProps {
    content: string;
}

export function DocsTOC({ content }: DocsTOCProps) {
    const [toc, setToc] = useState<TocItem[]>([]);
    const [activeId, setActiveId] = useState<string>('');

    useEffect(() => {
        const items = extractToc(content);
        setToc(items);

        // Setup intersection observer for scroll spy
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            {
                rootMargin: '-100px 0px -80% 0px',
            }
        );

        // Observe all headings
        items.forEach(item => {
            const el = document.getElementById(item.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [content]);

    if (toc.length === 0) {
        return null;
    }

    const handleClick = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="sticky top-20 hidden xl:block">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                On this page
            </div>
            <nav className="space-y-1">
                {toc.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleClick(item.id)}
                        className={cn(
                            'block w-full text-left text-sm py-1 transition-colors',
                            item.level === 2 ? 'pl-0' : 'pl-4',
                            activeId === item.id
                                ? 'text-blue-600 dark:text-blue-400 font-medium'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        )}
                    >
                        {item.text}
                    </button>
                ))}
            </nav>
        </div>
    );
}
