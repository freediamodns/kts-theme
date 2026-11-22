import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'resources/scripts';
const SKIP = new Set(['LucideIcon', 'LucideProps', 'IconSetProvider', 'loadIconSet', 'useIconSet', 'STROKE_SETS', 'Glyphs']);

const names = new Set();

function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (full.includes('dezerx/icons')) continue;
            walk(full);
            continue;
        }

        if (!/\.(ts|tsx)$/.test(entry.name)) continue;

        const src = fs.readFileSync(full, 'utf8');

        for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*'lucide-react'/g)) {
            for (const raw of m[1].split(',')) {
                const name = raw.trim().split(/\s+as\s+/)[0].replace(/^type\s+/, '').trim();
                if (/^[A-Z][A-Za-z0-9]*$/.test(name) && !SKIP.has(name)) names.add(name);
            }
        }
    }
}

walk(ROOT);

const sorted = [...names].sort();
fs.writeFileSync('resources/scripts/dezerx/icons/names.txt', sorted.join('\n') + '\n');
console.log(`${sorted.length} icon names`);
