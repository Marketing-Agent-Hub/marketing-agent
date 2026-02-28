// Markdown renderer with plugins
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import { cn } from '../utils';
import type { Components } from 'react-markdown';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const components: Partial<Components> = {
  h1: ({ children, id }) => (
    <h1 id={id} className="text-4xl font-bold mt-8 mb-4 text-gray-900 dark:text-white scroll-mt-20">
      {children}
    </h1>
  ),
  h2: ({ children, id }) => (
    <h2 id={id} className="text-3xl font-semibold mt-8 mb-4 text-gray-900 dark:text-white scroll-mt-20 border-b border-gray-200 dark:border-gray-700 pb-2">
      {children}
    </h2>
  ),
  p: ({ children }) => (
    <p className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target={href?.startsWith('http') ? '_blank' : undefined}>
      {children}
    </a>
  ),
  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-pink-600 dark:text-pink-400 rounded text-sm font-mono" {...props}>{children}</code>;
    }
    return <code className={cn('text-sm', className)} {...props}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-4 p-4 bg-gray-900 dark:bg-gray-950 rounded-lg overflow-x-auto">{children}</pre>
  ),
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('prose prose-slate dark:prose-invert max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug, rehypeHighlight, rehypeRaw]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
