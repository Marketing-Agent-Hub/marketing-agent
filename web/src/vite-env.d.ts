/// <reference types="vite/client" />

// Polyfill for gray-matter in browser
interface Window {
    Buffer: typeof import('buffer').Buffer;
}

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
    readonly glob: <T = any>(
        pattern: string,
        options?: {
            eager?: boolean;
            import?: string;
            query?: string;
        }
    ) => Record<string, T>;
}
// Type declarations for packages without types
declare module 'gray-matter' {
    export interface GrayMatterFile<T> {
        data: T;
        content: string;
        excerpt?: string;
        orig: Buffer | string;
        language: string;
        matter: string;
        stringify(lang: string): string;
    }

    export interface GrayMatterOption<
        I = any,
        O = any
    > {
        excerpt?: boolean | ((file: GrayMatterFile<I>) => string);
        excerpt_separator?: string;
        engines?: {
            [index: string]: (input: string, options?: any) => object;
        };
        language?: string;
        delimiters?: string | [string, string];
        sections?: boolean;
    }

    function matter<T = any>(
        input: string | Buffer,
        options?: GrayMatterOption
    ): GrayMatterFile<T>;

    export = matter;
}