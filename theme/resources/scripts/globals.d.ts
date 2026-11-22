declare module '*.jpg';
declare module '*.png';
declare module '*.svg';
declare module '*.css';

declare module 'markdown-it-task-lists' {
    import type MarkdownIt from 'markdown-it';

    const taskLists: MarkdownIt.PluginWithOptions<{ enabled?: boolean; label?: boolean; labelAfter?: boolean }>;

    export default taskLists;
}
