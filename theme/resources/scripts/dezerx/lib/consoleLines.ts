import { t } from '@/i18n';
import type { ConsoleRule } from '@/dezerx/lib/panelTheme';
export type ConsoleLevel = 'info' | 'warn' | 'error';

export interface ConsoleLine {
    id: number;
    text: string;
    plain: string;
    level: ConsoleLevel;
}

export function makeLine(id: number, text: string): ConsoleLine {
    const plain = stripAnsi(text);

    return { id, text, plain, level: levelFrom(plain) };
}

const ERROR_LINE =
    /\b(?:ERROR|SEVERE|FATAL)\b|\bERR!|^\s*(?:Caused by:|Exception in thread)|^\s*at [\w$.]+\([^)]*:\d+\)/;

const WARN_LINE = /\b(?:WARN|WARNING)\b/;

const ANSI = new RegExp('\u001b\\[[0-9;?]*[ -/]*[@-~]', 'g');

export function stripAnsi(line: string): string {
    return line.replace(ANSI, '');
}

export function levelFrom(plain: string): ConsoleLevel {
    if (ERROR_LINE.test(plain)) {
        return 'error';
    }

    return WARN_LINE.test(plain) ? 'warn' : 'info';
}

export function levelOf(line: string): ConsoleLevel {
    return levelFrom(stripAnsi(line));
}

export const ART_LIMIT = 2000;

export const ART_MAX_LINES = 40;

const EXPANSION_CEILING = 60;

function matches(line: string, rule: ConsoleRule): boolean {
    if (!rule.regex) {
        return line.includes(rule.find);
    }

    try {
        return new RegExp(rule.find).test(line);
    } catch {
        return false;
    }
}

function replaced(line: string, rule: ConsoleRule): string {
    if (!rule.regex) {
        return line.split(rule.find).join(rule.replace);
    }

    try {
        return line.replace(new RegExp(rule.find, 'g'), rule.replace);
    } catch {
        return line;
    }
}

export function artLines(art: string): string[] {
    if (art === '') {
        return [];
    }

    return art.replace(/\r\n?/g, '\n').split('\n').slice(0, ART_MAX_LINES);
}

export function applyRules(line: string, rules: readonly ConsoleRule[]): string[] {
    let out = [line];

    for (const rule of rules) {
        if (!rule.enabled || rule.find === '') {
            continue;
        }

        if (!rule.art) {
            out = out.map((text) => replaced(text, rule));

            continue;
        }

        const art = artLines(rule.replace);
        const next: string[] = [];

        for (const text of out) {
            if (!matches(text, rule)) {
                next.push(text);

                continue;
            }

            next.push(...art);
        }

        out = next.slice(0, EXPANSION_CEILING);
    }

    return out;
}

export type LineFilter = 'all' | 'warn' | 'error';

export interface Matcher {
    test: (text: string) => boolean;
    error: string | null;
    active: boolean;
}

export function buildMatcher(term: string, regex: boolean): Matcher {
    const trimmed = term.trim();

    if (trimmed === '') {
        return { test: () => true, error: null, active: false };
    }

    if (!regex) {
        const needle = trimmed.toLowerCase();

        return { test: (text) => text.toLowerCase().includes(needle), error: null, active: true };
    }

    try {
        const pattern = new RegExp(trimmed, 'i');

        return { test: (text) => pattern.test(text), error: null, active: true };
    } catch (error) {
        return {
            test: () => true,
            error: error instanceof Error ? error.message : t('console.invalidExpression'),
            active: false,
        };
    }
}
