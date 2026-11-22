import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

const escape = new MarkdownIt().utils.escapeHtml;

const md = new MarkdownIt({
    html: true,
    xhtmlOut: false,
    breaks: true,
    linkify: true,
    typographer: true,
    highlight(code, language) {
        if (language && hljs.getLanguage(language)) {
            try {
                return `<pre class="hljs"><code>${
                    hljs.highlight(code, { language, ignoreIllegals: true }).value
                }</code></pre>`;
            } catch {}
        }

        return `<pre class="hljs"><code>${escape(code)}</code></pre>`;
    },
}).use(taskLists, { label: true });

const defaultLink =
    md.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));

md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    tokens[index].attrSet('target', '_blank');
    tokens[index].attrSet('rel', 'noopener noreferrer nofollow');

    return defaultLink(tokens, index, options, env, self);
};

export function renderMarkdown(source: string): string {
    return DOMPurify.sanitize(md.render(source), {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel', 'checked', 'disabled', 'align', 'colspan', 'rowspan'],
        FORBID_TAGS: ['style', 'form', 'input:not([type=checkbox])'],
    });
}

export function isMarkdown(path: string | null): boolean {
    if (path === null) {
        return false;
    }

    const name = (path.split('/').pop() ?? path).toLowerCase();

    return name.endsWith('.md') || name.endsWith('.markdown') || name.endsWith('.mdown');
}
