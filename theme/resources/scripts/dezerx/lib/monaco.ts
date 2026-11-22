import type * as Monaco from 'monaco-editor';
import nightOwl from './themes/night-owl.json';
import githubLight from './themes/github-light.json';

export const DARK_THEME = 'dezerx-dark';
export const LIGHT_THEME = 'dezerx-light';

const FROM_MIME: Record<string, string> = {
    'text/x-csrc': 'cpp',
    'text/x-c++src': 'cpp',
    'text/x-csharp': 'csharp',
    'text/css': 'css',
    'text/x-cassandra': 'sql',
    'text/x-diff': 'plaintext',
    'text/x-dockerfile': 'dockerfile',
    'text/x-gfm': 'markdown',
    'text/x-go': 'go',
    'text/html': 'html',
    'message/http': 'plaintext',
    'text/javascript': 'javascript',
    'application/json': 'json',
    'text/x-lua': 'lua',
    'text/x-markdown': 'markdown',
    'text/x-mariadb': 'mysql',
    'text/x-mssql': 'sql',
    'text/x-mysql': 'mysql',
    'text/x-nginx-conf': 'ini',
    'text/x-php': 'php',
    'text/plain': 'plaintext',
    'text/x-pgsql': 'sql',
    'text/x-properties': 'ini',
    'text/x-pug': 'pug',
    'text/x-python': 'python',
    'text/x-ruby': 'ruby',
    'text/x-rustsrc': 'rust',
    'text/x-sass': 'scss',
    'text/x-scss': 'scss',
    'text/x-sh': 'shell',
    'text/x-sql': 'sql',
    'text/x-sqlite': 'sql',
    'text/x-toml': 'ini',
    'application/typescript': 'typescript',
    'script/x-vue': 'html',
    'application/xml': 'xml',
    'text/x-yaml': 'yaml',
};

const FROM_EXTENSION: Record<string, string> = {
    bash: 'shell',
    bat: 'bat',
    c: 'cpp',
    cc: 'cpp',
    cfg: 'ini',
    cmd: 'bat',
    conf: 'ini',
    cpp: 'cpp',
    cs: 'csharp',
    css: 'css',
    gql: 'graphql',
    graphql: 'graphql',
    go: 'go',
    h: 'cpp',
    hpp: 'cpp',
    htm: 'html',
    html: 'html',
    ini: 'ini',
    java: 'java',
    js: 'javascript',
    json: 'json',
    json5: 'json',
    less: 'less',
    log: 'plaintext',
    lua: 'lua',
    markdown: 'markdown',
    md: 'markdown',
    mjs: 'javascript',
    perl: 'perl',
    php: 'php',
    pl: 'perl',
    properties: 'ini',
    ps1: 'powershell',
    pug: 'pug',
    py: 'python',
    r: 'r',
    rb: 'ruby',
    rs: 'rust',
    sass: 'scss',
    scss: 'scss',
    sh: 'shell',
    sql: 'sql',
    toml: 'ini',
    ts: 'typescript',
    txt: 'plaintext',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
};

const FROM_FILENAME: { pattern: RegExp; language: string }[] = [
    { pattern: /^dockerfile$/i, language: 'dockerfile' },
    { pattern: /^\.env(\..+)?$/i, language: 'ini' },
    { pattern: /^(makefile|gnumakefile)$/i, language: 'plaintext' },
    { pattern: /\.ya?ml\.(bak|old|disabled)$/i, language: 'yaml' },
];

export function languageForMime(mime: string): string {
    return FROM_MIME[mime] ?? 'plaintext';
}

export function languageFor(path: string): string {
    const name = path.split('/').pop() ?? path;

    for (const { pattern, language } of FROM_FILENAME) {
        if (pattern.test(name)) {
            return language;
        }
    }

    const dot = name.lastIndexOf('.');
    const extension = dot > -1 ? name.slice(dot + 1).toLowerCase() : '';

    return FROM_EXTENSION[extension] ?? 'plaintext';
}

let defined = false;

type ThemeData = Monaco.editor.IStandaloneThemeData;

function surfaced(theme: ThemeData, colors: Record<string, string>): ThemeData {
    const background = colors['editor.background'];

    return {
        base: theme.base,
        inherit: true,
        rules: theme.rules.map((rule) => (rule.token === '' ? { ...rule, background: background.slice(1) } : rule)),
        colors: { ...theme.colors, ...colors },
    };
}

export function defineThemes(monaco: typeof Monaco): void {
    if (defined) {
        return;
    }

    monaco.editor.defineTheme(
        DARK_THEME,
        surfaced(nightOwl as ThemeData, {
            'editor.background': '#0f1219',
            'editor.lineHighlightBackground': '#161a23',
            'editorGutter.background': '#0f1219',
            'editorLineNumber.foreground': '#3f4757',
            'editorLineNumber.activeForeground': '#8b95a7',
            'editorIndentGuide.background1': '#1d2330',
            'editorWidget.background': '#161a23',
            'editorWidget.border': '#232a38',
            'editorSuggestWidget.background': '#161a23',
            'input.background': '#0f1219',
            'scrollbarSlider.background': '#232a3899',
            'scrollbarSlider.hoverBackground': '#2c3444cc',
        })
    );

    monaco.editor.defineTheme(
        LIGHT_THEME,
        surfaced(githubLight as ThemeData, {
            'editor.background': '#ffffff',
            'editor.lineHighlightBackground': '#f3f5f8',
            'editorLineNumber.foreground': '#aab2c0',
            'editorLineNumber.activeForeground': '#55607a',
        })
    );

    defined = true;
}
