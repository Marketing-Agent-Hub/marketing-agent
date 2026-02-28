// Documentation registry - scan and parse markdown files
import { Buffer } from 'buffer';
import matter from 'gray-matter';

// Make Buffer available globally for gray-matter
if (typeof window !== 'undefined') {
    window.Buffer = Buffer;
}

export interface DocsMetadata {
    title: string;
    order?: number;
    hidden?: boolean;
    [key: string]: any;
}

export interface DocFile {
    path: string; // Full path like '/overview/index.md'
    slug: string; // URL slug like '/overview' or '/guides/getting-started'
    metadata: DocsMetadata;
    content: string;
}

export interface DocTreeNode {
    label: string; // Display name
    slug: string; // URL path
    order: number;
    children?: DocTreeNode[];
}

// Import all markdown files using Vite's glob import
// Try absolute path from project root
const modules = import.meta.glob<string>('/src/documents/**/*.md', {
    query: '?raw',
    import: 'default',
    eager: true,
});

console.log('[Docs Registry] INIT - modules object:', modules);
console.log('[Docs Registry] INIT - module count:', Object.keys(modules).length);

// Parse all markdown files
export function getAllDocs(): DocFile[] {
    console.log('[Docs Registry] getAllDocs() called');
    const docs: DocFile[] = [];

    // Debug: log how many files were found
    console.log('[Docs Registry] Loaded modules:', Object.keys(modules).length);
    console.log('[Docs Registry] Module paths:', Object.keys(modules));

    for (const [filePath, rawContent] of Object.entries(modules)) {
        // Convert file path to slug
        // '/src/documents/overview/index.md' -> '/overview'
        // '/src/documents/guides/getting-started.md' -> '/guides/getting-started'
        let slug = filePath
            .replace('/src/documents', '')
            .replace(/\.md$/, '')
            .replace(/\/index$/, ''); // Remove /index

        // Ensure leading slash
        if (!slug.startsWith('/')) {
            slug = '/' + slug;
        }

        // Handle root index
        if (slug === '') {
            slug = '/';
        }

        // Parse frontmatter
        const { data, content } = matter(rawContent);

        docs.push({
            path: filePath,
            slug,
            metadata: {
                title: data.title || 'Untitled',
                order: data.order,
                hidden: data.hidden || false,
                ...data,
            },
            content,
        });
    }

    return docs;
}

// Get single doc by slug
export function getDocBySlug(slug: string): DocFile | undefined {
    const docs = getAllDocs();

    // Normalize slug
    let normalized = slug;
    if (!normalized.startsWith('/')) {
        normalized = '/' + normalized;
    }

    return docs.find(doc => doc.slug === normalized);
}

// Build tree structure from flat docs list
export function buildDocTree(): DocTreeNode[] {
    const docs = getAllDocs().filter(doc => !doc.metadata.hidden);
    const tree: DocTreeNode[] = [];

    // Group by first path segment
    const groups = new Map<string, DocFile[]>();

    for (const doc of docs) {
        const parts = doc.slug.split('/').filter(Boolean);
        const firstPart = parts[0] || 'root';

        if (!groups.has(firstPart)) {
            groups.set(firstPart, []);
        }
        groups.get(firstPart)!.push(doc);
    }

    // Build tree nodes
    for (const [groupKey, groupDocs] of groups) {
        // Find index doc for this group
        const indexDoc = groupDocs.find(d => d.slug === `/${groupKey}` || d.slug === `/`);

        if (!indexDoc) continue;

        const node: DocTreeNode = {
            label: indexDoc.metadata.title,
            slug: indexDoc.slug,
            order: indexDoc.metadata.order || 999,
            children: [],
        };

        // Add child docs
        const childDocs = groupDocs.filter(d => d !== indexDoc);
        for (const child of childDocs) {
            node.children!.push({
                label: child.metadata.title,
                slug: child.slug,
                order: child.metadata.order || 999,
            });
        }

        // Sort children by order then label
        node.children!.sort((a, b) => {
            if (a.order !== b.order) return a.order - b.order;
            return a.label.localeCompare(b.label);
        });

        tree.push(node);
    }

    // Sort top-level by order then label
    tree.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return a.label.localeCompare(a.label);
    });

    return tree;
}

// Get TOC from markdown content
export interface TocItem {
    id: string;
    text: string;
    level: number;
}

export function extractToc(content: string): TocItem[] {
    const toc: TocItem[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
        // Match h2 and h3 headings
        const match = line.match(/^(#{2,3})\s+(.+)$/);
        if (!match) continue;

        const level = match[1].length;
        const text = match[2].trim();

        // Generate ID (kebab-case)
        const id = text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');

        toc.push({ id, text, level });
    }

    return toc;
}

// Search in docs
export function searchDocs(query: string): DocFile[] {
    const docs = getAllDocs().filter(doc => !doc.metadata.hidden);
    const lowerQuery = query.toLowerCase();

    return docs.filter(doc => {
        const titleMatch = doc.metadata.title.toLowerCase().includes(lowerQuery);
        const contentMatch = doc.content.toLowerCase().includes(lowerQuery);
        return titleMatch || contentMatch;
    }).slice(0, 10); // Limit results
}
