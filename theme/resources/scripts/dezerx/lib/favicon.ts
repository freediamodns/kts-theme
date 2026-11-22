
const ICON_SELECTOR = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
    'link[rel="mask-icon"]',
    'link[rel="manifest"]',
].join(',');

const STOCK = [
    '<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">',
    '<link rel="icon" type="image/png" href="/favicons/favicon-32x32.png" sizes="32x32">',
    '<link rel="icon" type="image/png" href="/favicons/favicon-16x16.png" sizes="16x16">',
    '<link rel="manifest" href="/favicons/manifest.json">',
    '<link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#bc6e3c">',
    '<link rel="shortcut icon" href="/favicons/favicon.ico">',
].join('');

let served: string | null = null;

let revision = 0;

function links(): HTMLLinkElement[] {
    return Array.from(document.querySelectorAll<HTMLLinkElement>(ICON_SELECTOR));
}

function replace(html: string): void {
    for (const link of links()) {
        link.remove();
    }

    document.head.insertAdjacentHTML('beforeend', html);
}

export function applyFaviconPreview(url: string | null): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (url === null) {
        if (served !== null) {
            replace(served);
            served = null;
        }

        return;
    }

    if (served === null) {
        served = links()
            .map((link) => link.outerHTML)
            .join('');
    }

    if (url === '') {
        replace(STOCK);

        return;
    }

    revision += 1;

    const href = `${url}${url.includes('?') ? '&' : '?'}v=${revision}`;
    const escaped = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

    replace(
        `<link rel="icon" href="${escaped}">` +
            `<link rel="shortcut icon" href="${escaped}">` +
            `<link rel="apple-touch-icon" href="${escaped}">`
    );
}

export function commitFaviconPreview(): void {
    served = null;
}
