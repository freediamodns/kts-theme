
export interface IgnoreRule {
    negated: boolean;
    exact: RegExp;
    prefix: RegExp;
    directoryOnly: boolean;
}

const META = /[.+^${}()|[\]\\]/g;

function translate(pattern: string): string {
    let out = '';
    let at = 0;

    while (at < pattern.length) {
        const char = pattern[at];

        if (char === '*') {
            if (pattern[at + 1] === '*') {
                const atSegmentStart = at === 0 || pattern[at - 1] === '/';

                if (atSegmentStart && pattern[at + 2] === '/') {
                    out += '(?:.+/)?';
                    at += 3;
                    continue;
                }

                out += '.*';
                at += 2;
                continue;
            }

            out += '[^/]*';
            at += 1;
            continue;
        }

        if (char === '?') {
            out += '[^/]';
            at += 1;
            continue;
        }

        if (char === '[') {
            let end = at + 1;

            if (pattern[end] === '!' || pattern[end] === '^') end += 1;
            if (pattern[end] === ']') end += 1;

            while (end < pattern.length && pattern[end] !== ']') end += 1;

            if (end < pattern.length) {
                const body = pattern.slice(at + 1, end);

                out += `[${body.startsWith('!') ? `^${body.slice(1)}` : body}]`;
                at = end + 1;
                continue;
            }

            out += '\\[';
            at += 1;
            continue;
        }

        if (char === '\\') {
            const next = pattern[at + 1];

            if (next !== undefined) {
                out += next.replace(META, '\\$&').replace(/[*?]/g, '\\$&');
                at += 2;
                continue;
            }

            out += '\\\\';
            at += 1;
            continue;
        }

        out += char.replace(META, '\\$&');
        at += 1;
    }

    return out;
}

function trimTrailing(line: string): string {
    let end = line.length;

    while (end > 0 && (line[end - 1] === ' ' || line[end - 1] === '\t')) {
        let slashes = 0;

        while (end - 1 - slashes > 0 && line[end - 2 - slashes] === '\\') {
            slashes += 1;
        }

        if (slashes % 2 === 1) break;

        end -= 1;
    }

    return line.slice(0, end);
}

export function parseIgnoreFile(text: string): IgnoreRule[] {
    const rules: IgnoreRule[] = [];

    for (const raw of text.split(/\r?\n/)) {
        let line = trimTrailing(raw);

        if (line === '' || line.startsWith('#')) continue;

        const negated = line.startsWith('!');

        if (negated) line = line.slice(1);

        if (line.startsWith('\\#') || line.startsWith('\\!')) line = line.slice(1);

        if (line === '') continue;

        const directoryOnly = line.endsWith('/') && line !== '/';

        if (directoryOnly) line = line.slice(0, -1);

        const anchored = line.slice(0, -1).includes('/') || line.startsWith('/');

        if (line.startsWith('/')) line = line.slice(1);

        if (line === '') continue;

        const body = translate(line);
        const head = anchored ? '' : '(?:.*/)?';

        rules.push({
            negated,
            directoryOnly,
            exact: new RegExp(`^${head}${body}$`),
            prefix: new RegExp(`^${head}${body}/`),
        });
    }

    return rules;
}

export function isIgnored(relative: string, directory: boolean, rules: IgnoreRule[]): boolean {
    let ignored = false;

    for (const rule of rules) {
        const hit = rule.prefix.test(relative) || (rule.exact.test(relative) && (!rule.directoryOnly || directory));

        if (hit) {
            ignored = !rule.negated;
        }
    }

    return ignored;
}

export function isIgnoredBy(path: string, directory: boolean, sets: Record<string, IgnoreRule[]>): boolean {
    let ignored = false;

    for (const root of Object.keys(sets).sort((a, b) => a.length - b.length)) {
        const base = root === '/' ? '/' : `${root}/`;

        if (path !== root && !path.startsWith(base)) continue;

        const rules = sets[root];

        if (!rules || rules.length === 0) continue;

        const relative = path.slice(base.length);

        if (relative === '') continue;

        if (rules.some((rule) => rule.prefix.test(relative) || rule.exact.test(relative))) {
            ignored = isIgnored(relative, directory, rules);
        }
    }

    return ignored;
}
