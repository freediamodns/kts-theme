const pack = process.argv[2];
const terms = process.argv.slice(3);

let names;
if (pack === 'hugeicons') {
    const m = await import('@hugeicons/core-free-icons');
    names = Object.keys(m).filter((n) => n.endsWith('Icon') && !n.endsWith('FreeIcons'));
} else {
    const m = await import('react-icons/' + pack);
    names = Object.keys(m);
}

for (const term of terms) {
    const hits = names.filter((n) => n.toLowerCase().includes(term.toLowerCase()));
    console.log(`\n${term} (${hits.length}):`);
    console.log('  ' + hits.slice(0, 14).join(' '));
}
