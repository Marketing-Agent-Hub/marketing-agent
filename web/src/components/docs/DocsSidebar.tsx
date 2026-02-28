// Docs sidebar navigation
import { Link, useLocation } from 'react-router-dom';
import { buildDocTree } from '../../lib/docs/registry';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface DocsSidebarProps {
    onNavigate?: () => void; // For mobile close
}

export function DocsSidebar({ onNavigate }: DocsSidebarProps) {
    const location = useLocation();
    const tree = buildDocTree();
    const [expanded, setExpanded] = useState<Set<string>>(new Set(tree.map(n => n.slug)));

    const toggleExpanded = (slug: string) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(slug)) {
            newExpanded.delete(slug);
        } else {
            newExpanded.add(slug);
        }
        setExpanded(newExpanded);
    };

    const isActive = (slug: string) => {
        const currentPath = location.pathname.replace('/docs', '');
        return currentPath === slug || currentPath === slug + '/';
    };

    return (
        <nav className="space-y-1">
            {tree.map((node) => {
                const hasChildren = node.children && node.children.length > 0;
                const isExpanded = expanded.has(node.slug);
                const active = isActive(node.slug);

                return (
                    <div key={node.slug}>
                        {/* Parent node */}
                        <div className="flex items-center">
                            {hasChildren && (
                                <button
                                    onClick={() => toggleExpanded(node.slug)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                    aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                >
                                    <svg
                                        className={cn(
                                            'w-4 h-4 transition-transform text-gray-500',
                                            isExpanded && 'rotate-90'
                                        )}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            )}
                            <Link
                                to={`/docs${node.slug}`}
                                onClick={onNavigate}
                                className={cn(
                                    'flex-1 px-3 py-2 text-sm rounded-md transition-colors',
                                    !hasChildren && 'ml-5',
                                    active
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                )}
                            >
                                {node.label}
                            </Link>
                        </div>

                        {/* Child nodes */}
                        {hasChildren && isExpanded && (
                            <div className="ml-5 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                                {node.children!.map((child) => {
                                    const childActive = isActive(child.slug);
                                    return (
                                        <Link
                                            key={child.slug}
                                            to={`/docs${child.slug}`}
                                            onClick={onNavigate}
                                            className={cn(
                                                'block px-3 py-2 text-sm rounded-md transition-colors',
                                                childActive
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                            )}
                                        >
                                            {child.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
