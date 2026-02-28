// Individual documentation page
import { useParams, Navigate } from 'react-router-dom';
import { getDocBySlug } from '../../lib/docs/registry';
import { MarkdownRenderer } from '../../lib/docs/markdown';
import { DocsTOC } from './DocsTOC';

export function DocsPage() {
    console.log('[DocsPage] Component rendered');
    const { '*': splat } = useParams();
    console.log('[DocsPage] splat param:', splat);

    // Convert route param to slug
    let slug = '/' + (splat || '');
    if (slug === '/') {
        slug = '/overview'; // Default to overview
    }

    console.log('[DocsPage] Looking for slug:', slug);

    const doc = getDocBySlug(slug);
    console.log('[DocsPage] Found doc:', doc ? doc.metadata.title : 'NOT FOUND');

    if (!doc) {
        // Try redirecting to index of that section
        const withIndex = slug + '/index';
        const indexDoc = getDocBySlug(withIndex);
        if (indexDoc) {
            return <Navigate to={`/docs${indexDoc.slug}`} replace />;
        }

        // Not found
        return (
            <div className="max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    Page Not Found
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    The documentation page you're looking for doesn't exist.
                </p>
                <a
                    href="/docs/overview"
                    className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline"
                >
                    ← Back to Overview
                </a>
            </div>
        );
    }

    return (
        <div className="flex gap-8">
            {/* Main content */}
            <article className="flex-1 max-w-4xl">
                <MarkdownRenderer content={doc.content} />

                {/* Contribution footer */}
                <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Found an issue with this page?{' '}
                        <a
                            href={`https://github.com/your-org/ocNewsBot/edit/main/web/src/documents${doc.slug.replace(/\/$/, '')}.md`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Edit on GitHub
                        </a>
                    </p>
                </div>
            </article>

            {/* Table of contents */}
            <aside className="w-56 flex-shrink-0">
                <DocsTOC content={doc.content} />
            </aside>
        </div>
    );
}
