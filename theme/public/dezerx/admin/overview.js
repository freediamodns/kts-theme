(function () {
    'use strict';

    const root = document.getElementById('dzo');

    if (!root || !window.fetch || !window.URLSearchParams) {
        return;
    }

    const endpoint = root.getAttribute('data-endpoint');
    const REFRESH_MS = 60000;
    const SVG = 'http://www.w3.org/2000/svg';
    const RANGES = {
        '1h': 'last hour', '6h': 'last 6 hours', '24h': 'last 24 hours', '7d': 'last 7 days', '30d': 'last 30 days',
        '90d': 'last 3 months', '180d': 'last 6 months', '1y': 'last year', all: 'lifetime',
    };

    const WITHIN = {
        '1h': ' in 1h', '6h': ' in 6h', '24h': ' in 24h', '7d': ' in 7 days', '30d': ' in 30 days',
        '90d': ' in 3 months', '180d': ' in 6 months', '1y': ' in a year', all: ', lifetime',
    };
    const COLORS = {
        in: '#3987e5', out: '#d95926', panel: '#1f2933', allocated: '#86b6ef', grid: 'rgba(202,209,216,.09)',
        ref: 'rgba(202,209,216,.45)', cross: 'rgba(202,209,216,.35)', free: 'rgba(202,209,216,.16)', ring: 'rgba(202,209,216,.05)',
    };

    const TONES = {
        in: '--sa-chart-1', panel: '--sa-chart-bg', allocated: '--sa-chart-soft', grid: '--sa-grid',
        ref: '--sa-ref', cross: '--sa-cross', free: '--sa-free', ring: '--sa-ring-track',
    };

    let tones = COLORS;

    function palette() {
        const probe = document.createElement('i');
        const out = {};

        probe.hidden = true;
        root.appendChild(probe);

        Object.keys(COLORS).forEach((key) => {
            probe.style.color = TONES[key] ? 'var(' + TONES[key] + ', ' + COLORS[key] + ')' : COLORS[key];
            out[key] = getComputedStyle(probe).color || COLORS[key];
        });

        probe.remove();

        return out;
    }

    const store = {
        get(key, fallback) {
            try {
                const value = window.localStorage.getItem(key);

                return value === null ? fallback : JSON.parse(value);
            } catch (e) {
                return fallback;
            }
        },
        set(key, value) {
            try {
                window.localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
            }
        },
    };

    const savedRange = store.get('dzo.range', '24h');
    const savedNodes = store.get('dzo.nodes', []);
    const savedKpi = store.get('dzo.kpi', []);
    const savedChartKind = store.get('dzo.chartkind', 'line');

    const state = {
        range: Object.prototype.hasOwnProperty.call(RANGES, savedRange) ? savedRange : '24h',
        nodes: Array.isArray(savedNodes) ? savedNodes.filter((id) => Number.isInteger(id) && id > 0) : [],
        chartKind: savedChartKind === 'bars' ? 'bars' : 'line',
        metric: 'overall',
        kpi: Array.from({ length: 6 }, (_, i) => (Array.isArray(savedKpi) && savedKpi[i] === 1 ? 1 : 0)),
        sort: { key: 'name', dir: 1 },
        data: null,
        timer: null,
        request: null,
        pending: false,
        nodeList: '',
    };


    const $ = (selector) => root.querySelector(selector);

    const page = (selector) => document.querySelector(selector);
    const rangeButtons = () => document.querySelectorAll('[data-dzo="range"] [data-range]');
    const chartKindButtons = () => document.querySelectorAll('[data-dzo="chartkind"] [data-kind]');

    function el(tag, props, children) {
        const node = document.createElement(tag);

        Object.entries(props || {}).forEach(([key, value]) => {
            if (value === null || value === undefined || value === false) {
                return;
            }

            if (key === 'text') {
                node.textContent = value;
            } else if (key === 'className') {
                node.className = value;
            } else {
                node.setAttribute(key, value === true ? '' : String(value));
            }
        });

        (children || []).forEach((child) => {
            if (child !== null && child !== undefined && child !== false) {
                node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
            }
        });

        return node;
    }

    function svg(tag, attrs) {
        const node = document.createElementNS(SVG, tag);

        Object.entries(attrs || {}).forEach(([key, value]) => node.setAttribute(key, String(value)));

        return node;
    }

    const has = (value) => value !== null && value !== undefined && Number.isFinite(value);

    function fixed(value) {
        const abs = Math.abs(value);

        return abs >= 100 ? value.toFixed(0) : abs >= 10 ? value.toFixed(1) : value.toFixed(2);
    }

    function scaled(value, base, units) {
        let i = 0;
        let n = Math.max(0, value);

        while (n >= base && i < units.length - 1) {
            n /= base;
            i++;
        }

        return i === 0 && base === 1024 ? Math.round(n) + ' ' + units[0] : fixed(n) + ' ' + units[i];
    }

    const fmt = {
        int: (n) => (has(n) ? Math.round(n).toLocaleString() : '–'),
        bytes: (n) => (has(n) ? scaled(n, 1024, ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']) : '–'),
        bits: (bytesPerSecond) => (has(bytesPerSecond) ? scaled(bytesPerSecond * 8, 1000, ['b/s', 'Kb/s', 'Mb/s', 'Gb/s', 'Tb/s']) : '–'),
        cores: (n) => (has(n) ? fixed(n) : '–'),
        pct: (part, whole) => (has(part) && whole > 0 ? Math.round((part / whole) * 100) + '%' : ''),
    };

    function clock(ts) {
        return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function axisTime(ts, range, span) {
        const date = new Date(ts * 1000);

        if (range === '7d') {
            return date.toLocaleDateString([], { weekday: 'short', day: 'numeric' });
        }

        if (span > 200 * 86400) {
            return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
        }

        if (span > 86400 * 2) {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function tipTime(ts, bucket) {
        const start = new Date(ts * 1000);
        const end = new Date((ts + bucket) * 1000);
        const day = (d) => d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: bucket >= 86400 ? 'numeric' : undefined });
        const time = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (bucket >= 86400) {
            return bucket === 86400 ? day(start) : day(start) + ' – ' + day(new Date(end.getTime() - 1000));
        }

        return bucket > 60 ? day(start) + ', ' + time(start) + '–' + time(end) : day(start) + ', ' + time(start);
    }

    function flag(code) {
        return typeof code === 'string' && /^[A-Z]{2}$/.test(code)
            ? el('img', { className: 'dzo-flag', src: '/dezerx/flags/' + code + '.svg', alt: code, title: code, width: 18, height: 13, loading: 'lazy' })
            : null;
    }

    function imageUrl(url) {
        return typeof url === 'string' && (/^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url)) ? url : null;
    }

    function badge(text, tone) {
        return el('span', { className: 'dzo-badge is-' + tone, text });
    }

    function ratio(part, whole) {
        return has(part) && whole > 0 ? Math.min(1, Math.max(0, part / whole)) : null;
    }

    function meter(fraction) {
        const fill = el('i', { className: fraction >= 0.9 ? 'is-crit' : fraction >= 0.75 ? 'is-warn' : '' });
        fill.style.width = (fraction * 100).toFixed(1) + '%';

        return el('div', { className: 'dzo-meter', role: 'presentation' }, [fill]);
    }

    function toneClass(fraction) {
        return has(fraction) && fraction >= 0.9 ? 'dzo-state-crit' : has(fraction) && fraction >= 0.75 ? 'dzo-state-warn' : '';
    }


    function load() {
        window.clearTimeout(state.timer);

        if (state.request) {
            state.request.abort();
        }

        const controller = new AbortController();
        const params = new URLSearchParams({ range: state.range });

        state.nodes.forEach((id) => params.append('nodes[]', String(id)));
        state.request = controller;
        state.pending = false;
        root.classList.add('is-loading');

        fetch(endpoint + '?' + params.toString(), {
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            signal: controller.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.status === 429 ? 'It was refreshed too often; it will try again shortly.' : 'The panel answered HTTP ' + response.status + '.');
                }

                return response.json();
            })
            .then((data) => {
                state.data = data;
                render();
            })
            .catch((error) => {
                if (error.name !== 'AbortError') {
                    notice(['Could not refresh the overview. ' + error.message]);
                }
            })
            .finally(() => {
                if (state.request === controller) {
                    state.request = null;
                    root.classList.remove('is-loading');
                    state.timer = window.setTimeout(() => (document.hidden ? (state.pending = true) : load()), REFRESH_MS);
                }
            });
    }

    let debounce = null;

    function reload() {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(load, 250);
    }

    window.addEventListener('stark:theme', () => {
        if (state.data) {
            tones = palette();
            renderCharts(state.data);
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && state.pending) {
            load();
        }
    });


    function render() {
        const data = state.data;

        const known = new Set(data.all_nodes.map((node) => node.id));
        const kept = state.nodes.filter((id) => known.has(id));

        if (kept.length !== state.nodes.length) {
            state.nodes = kept;
            store.set('dzo.nodes', kept);
        }

        tones = palette();

        renderStatus(data);
        renderFilters(data);
        renderKpis(data);
        renderCharts(data);
        renderNodes(data);
        renderTop(data);
    }

    function notice(lines) {
        const box = $('[data-dzo="notice"]');

        box.textContent = '';
        (lines || []).forEach((line, i) => {
            if (i > 0) {
                box.appendChild(el('br'));
            }

            box.appendChild(document.createTextNode(line));
        });
        box.hidden = !lines || lines.length === 0;
    }

    function renderStatus(data) {
        const updated = page('[data-dzo="updated"]');

        if (updated) updated.textContent = data.snapshot_at
            ? 'Sampled at ' + clock(data.snapshot_at) + ' · ' + data.totals.online + ' of ' + data.totals.nodes + (data.totals.nodes === 1 ? ' node' : ' nodes') + ' reporting · refreshes every minute'
            : 'No samples yet';

        const lines = [];

        if (!data.snapshot_at) {
            lines.push('Nothing has been sampled yet. The first sample is taken within a minute of switching this on, by the panel\'s scheduler (php artisan schedule:run), which has to be running every minute.');
        } else if (data.stale) {
            const minutes = Math.round((data.generated_at - data.snapshot_at) / 60);
            lines.push('The latest sample is ' + minutes + ' minutes old, so the scheduler may have stopped. The figures below are not current.');
        }

        notice(lines);
    }

    function renderFilters(data) {
        rangeButtons().forEach((button) => {
            button.setAttribute('aria-pressed', button.getAttribute('data-range') === state.range ? 'true' : 'false');
        });

        const toggle = page('.dzo-nodes-toggle');

        if (!toggle) {
            return;
        }

        const names = new Map(data.all_nodes.map((node) => [node.id, node.name]));

        toggle.textContent = state.nodes.length === 0 ? 'All nodes' : state.nodes.length === 1 ? names.get(state.nodes[0]) || '1 node' : state.nodes.length + ' nodes';

        const signature = data.all_nodes.map((node) => node.id + ':' + node.name).join('|');
        const list = page('.dzo-nodes-list');

        if (signature !== state.nodeList) {
            state.nodeList = signature;
            list.textContent = '';
            list.appendChild(check('all', 'All nodes', null, 'dzo-nodes-all'));
            data.all_nodes.forEach((node) => list.appendChild(check(String(node.id), node.name, node.location, null)));
            page('.dzo-nodes-search').hidden = data.all_nodes.length <= 8;
        }

        list.querySelectorAll('input').forEach((input) => {
            input.checked = input.value === 'all' ? state.nodes.length === 0 : state.nodes.includes(Number(input.value));
        });
    }

    function check(value, label, small, className) {
        return el('label', { className: 'dz-check' + (className ? ' ' + className : ''), 'data-name': label.toLowerCase() }, [
            el('input', { type: 'checkbox', value }),
            el('span', { className: 'dz-check-box' }),
            el('span', { className: 'dz-check-text' }, [label, small ? el('small', { text: small }) : null]),
        ]);
    }

    function kpi(index, value, unit, fraction, lines, limited) {
        const cell = root.querySelectorAll('.dzo-kpi')[index];
        const valueNode = cell.querySelector('.dzo-kpi-value');
        const bar = cell.querySelector('.dzo-kpi-meter');
        const fill = bar.querySelector('i');

        valueNode.textContent = value;
        const tone = limited ? toneClass(fraction) : '';
        valueNode.className = 'dzo-kpi-value' + (tone ? ' ' + tone : '');

        if (unit) {
            valueNode.appendChild(el('small', { text: unit }));
        }

        bar.classList.toggle('is-none', fraction === null);
        fill.className = fraction >= 0.9 ? 'is-crit' : fraction >= 0.75 ? 'is-warn' : '';
        fill.style.width = fraction === null ? '0' : (fraction * 100).toFixed(1) + '%';

        const view = state.kpi[index] || 0;
        const sub = cell.querySelector('.dzo-kpi-sub');

        sub.textContent = lines[view] || '\u00a0';
        sub.title = lines[view] || '';
        sub.classList.toggle('is-alt', view === 1);
    }

    function peak(values) {
        return values.reduce((max, v) => (has(v) && (max === null || v > max) ? v : max), null);
    }

    function renderKpis(data) {
        const t = data.totals;
        const s = t.servers;
        const within = WITHIN[data.range] || '';
        const cpuPeak = peak(data.series.cpu);
        const netPeak = peak(data.series.rx.map((rx, i) => (has(rx) || has(data.series.tx[i]) ? (rx || 0) + (data.series.tx[i] || 0) : null)));
        const quiet = [];

        [[s.unknown, 'unreachable'], [s.suspended, 'suspended'], [s.installing, 'installing'], [s.starting, 'starting'], [s.stopping, 'stopping']].forEach(([count, label]) => {
            if (count > 0) {
                quiet.push(fmt.int(count) + ' ' + label);
            }
        });

        kpi(0, fmt.int(s.total), null, ratio(s.running, s.total), [
            fmt.int(s.running) + ' running · ' + fmt.int(s.offline) + ' offline',
            quiet.length ? quiet.join(' · ') : 'none suspended or installing',
        ]);

        kpi(1, fmt.cores(t.cpu.cores), 'cores', ratio(t.cpu.cores, t.cpu.threads), [
            t.cpu.threads > 0 ? fmt.pct(t.cpu.cores, t.cpu.threads) + ' of ' + fmt.int(t.cpu.threads) + ' threads' : 'hardware not reported yet',
            cpuPeak === null ? 'no samples in range' : 'Peak ' + fmt.cores(cpuPeak) + ' cores' + within,
        ], true);

        kpi(2, fmt.bytes(t.memory.used), null, ratio(t.memory.used, t.memory.physical), [
            t.memory.physical > 0 ? fmt.pct(t.memory.used, t.memory.physical) + ' of ' + fmt.bytes(t.memory.physical) + ' installed' : 'in use',
            fmt.bytes(t.memory.allocated) + ' allocated of ' + fmt.bytes(t.memory.limit),
        ], true);

        kpi(3, fmt.bytes(t.disk.used), null, ratio(t.disk.used, t.disk.limit), [
            t.disk.limit > 0 ? fmt.pct(t.disk.used, t.disk.limit) + ' of ' + fmt.bytes(t.disk.limit) : 'in use',
            fmt.bytes(t.disk.allocated) + ' allocated to servers',
        ], true);

        kpi(4, fmt.bits(t.network.rx + t.network.tx), null, null, [
            fmt.bits(t.network.rx) + ' in · ' + fmt.bits(t.network.tx) + ' out',
            netPeak === null ? 'no samples in range' : 'Peak ' + fmt.bits(netPeak) + within,
        ]);

        kpi(5, fmt.bytes(t.transfer.rx + t.transfer.tx), null, null, [
            fmt.bytes(t.transfer.rx) + ' in · ' + fmt.bytes(t.transfer.tx) + ' out',
            'transferred' + within,
        ]);
    }

    function renderCharts(data) {
        const t = data.totals;
        const series = data.series;
        const base = { t: series.t, bucket: series.bucket, range: data.range, reporting: series.reporting, nodes: data.nodes.length };

        draw('cpu', Object.assign({}, base, {
            kind: 'cores',
            series: [{ label: 'CPU', color: tones.in, values: series.cpu }],
            ref: t.cpu.threads > 0 ? { value: t.cpu.threads, label: fmt.int(t.cpu.threads) + ' threads' } : null,
        }));

        draw('memory', Object.assign({}, base, {
            kind: 'bytes',
            series: [{ label: 'Memory', color: tones.in, values: series.memory }],
            ref: t.memory.physical > 0 ? { value: t.memory.physical, label: fmt.bytes(t.memory.physical) + ' installed' } : null,
        }));

        donut(data);

        draw('network', Object.assign({}, base, {
            kind: 'bits',
            series: [
                { label: 'In', color: tones.in, values: series.rx },
                { label: 'Out', color: tones.out, values: series.tx },
            ],
            ref: null,
        }));

        now('cpu', [{ b: fmt.cores(t.cpu.cores) }, ' cores'].concat(t.cpu.threads > 0 ? [' of ' + fmt.int(t.cpu.threads)] : []));
        now('memory', [{ b: fmt.bytes(t.memory.used) }].concat(t.memory.physical > 0 ? [' of ' + fmt.bytes(t.memory.physical)] : []));
        now('disk', [{ b: fmt.bytes(t.disk.used) }].concat(t.disk.limit > 0 ? [' of ' + fmt.bytes(t.disk.limit)] : []));
        now('network', [{ b: fmt.bits(t.network.rx + t.network.tx) }]);
    }

    function now(key, parts) {
        const node = root.querySelector('[data-dzo-now="' + key + '"]');

        node.textContent = '';
        parts.forEach((part) => node.appendChild(typeof part === 'string' ? document.createTextNode(part) : el('b', { text: part.b })));
    }


    const charts = new Map();

    function draw(key, config) {
        const figure = root.querySelector('[data-dzo-chart="' + key + '"]');

        if (!charts.has(key)) {
            const chart = { figure, config: null, index: null };
            charts.set(key, chart);
            bindChart(chart);

            if (window.ResizeObserver) {
                let frame = null;
                new ResizeObserver(() => {
                    window.cancelAnimationFrame(frame);
                    frame = window.requestAnimationFrame(() => paint(chart));
                }).observe(figure);
            }
        }

        const chart = charts.get(key);
        chart.config = config;
        paint(chart);
    }

    function niceStep(raw) {
        const exponent = Math.floor(Math.log10(raw));
        const fraction = raw / Math.pow(10, exponent);
        const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

        return nice * Math.pow(10, exponent);
    }

    function axisUnit(kind, max) {
        if (kind === 'cores') {
            return { divisor: 1, unit: '' };
        }

        const base = kind === 'bytes' ? 1024 : 1000;
        const units = kind === 'bytes' ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] : ['b/s', 'Kb/s', 'Mb/s', 'Gb/s', 'Tb/s'];
        const multiplier = kind === 'bits' ? 8 : 1;
        let divisor = 1;
        let i = 0;

        while ((max * multiplier) / divisor >= base && i < units.length - 1) {
            divisor *= base;
            i++;
        }

        return { divisor: divisor / multiplier, unit: units[i] };
    }

    function formatValue(kind, value) {
        return kind === 'bytes' ? fmt.bytes(value) : kind === 'bits' ? fmt.bits(value) : fmt.cores(value) + ' cores';
    }

    function paint(chart) {
        const config = chart.config;
        const figure = chart.figure;

        if (!config) {
            return;
        }

        const width = figure.clientWidth;
        const height = figure.clientHeight;

        if (width < 50) {
            return;
        }

        const margin = { left: 66, right: 18, top: 24, bottom: 38 };
        const innerW = width - margin.left - margin.right;
        const innerH = height - margin.top - margin.bottom;
        const count = config.t.length;
        let dataMax = 0;

        config.series.forEach((s) => s.values.forEach((v) => has(v) && (dataMax = Math.max(dataMax, v))));

        const showRef = config.ref && config.ref.value > 0 && dataMax >= config.ref.value * 0.2;
        const max = Math.max(dataMax, showRef ? config.ref.value : 0);
        const { divisor, unit } = axisUnit(config.kind, max || 1);
        const top = max > 0 ? max / divisor : 1;
        const step = niceStep(top / 4);
        const yMax = Math.ceil((top * 1.04) / step) * step;
        const x = (i) => margin.left + (count <= 1 ? innerW : (innerW * i) / (count - 1));
        const y = (v) => margin.top + innerH - (innerH * (v / divisor)) / yMax;

        const canvas = svg('svg', { viewBox: '0 0 ' + width + ' ' + height, width, height, role: 'img', 'aria-hidden': 'true' });
        const grid = svg('g');

        for (let v = 0; v <= yMax + step / 2; v += step) {
            const py = margin.top + innerH - (innerH * v) / yMax;
            grid.appendChild(svg('line', { x1: margin.left, x2: width - margin.right, y1: py, y2: py, stroke: tones.grid, 'stroke-width': 1, 'shape-rendering': 'crispEdges' }));
            const label = svg('text', { x: margin.left - 8, y: py + 4, 'text-anchor': 'end', class: 'dzo-axis' });
            label.textContent = (Number.isInteger(v) ? String(v) : String(+v.toFixed(2))) + (unit ? ' ' + unit : '');
            grid.appendChild(label);
        }

        const ticks = Math.min(6, Math.max(2, Math.floor(innerW / 110)));

        for (let j = 0; j < ticks && count > 1; j++) {
            const i = Math.round((j * (count - 1)) / (ticks - 1));
            const label = svg('text', { x: x(i), y: height - 14, 'text-anchor': j === 0 ? 'start' : j === ticks - 1 ? 'end' : 'middle', class: 'dzo-axis' });
            label.textContent = axisTime(config.t[i], config.range, config.t[count - 1] - config.t[0]);
            grid.appendChild(label);
        }

        canvas.appendChild(grid);

        if (showRef) {
            const ry = Math.round(y(config.ref.value)) + 0.5;
            canvas.appendChild(svg('line', { x1: margin.left, x2: width - margin.right, y1: ry, y2: ry, stroke: tones.ref, 'stroke-width': 1 }));
            const label = svg('text', { x: width - margin.right, y: ry - 5, 'text-anchor': 'end', class: 'dzo-ref' });
            label.textContent = config.ref.label;
            canvas.appendChild(label);
        }

        if (state.chartKind === 'bars') {
            const floor = margin.top + innerH;
            const seriesCount = config.series.length;
            const slot = count > 0 ? innerW / count : innerW;
            const groupW = Math.max(1, slot - Math.min(3, slot * 0.25));
            const barW = Math.max(1, groupW / seriesCount);

            config.series.forEach((s, si) => {
                s.values.forEach((v, i) => {
                    if (!has(v)) {
                        return;
                    }

                    const centre = x(i);
                    const w = seriesCount === 1 ? groupW : barW;
                    let bx = seriesCount === 1 ? centre - w / 2 : centre - groupW / 2 + si * barW;

                    bx = Math.max(margin.left, Math.min(bx, width - margin.right - w));

                    const by = Math.min(floor, y(v));

                    canvas.appendChild(svg('rect', {
                        x: bx.toFixed(1), y: by.toFixed(1), width: w.toFixed(1), height: Math.max(0, floor - by).toFixed(1),
                        fill: s.color, 'fill-opacity': seriesCount > 1 ? 0.85 : 0.7, rx: Math.min(1.5, w / 3),
                    }));
                });
            });
        } else {
            config.series.forEach((s) => {
                let line = '';
                let area = '';
                let run = [];

                const flush = () => {
                    if (run.length === 1) {
                        canvas.appendChild(svg('circle', { cx: x(run[0]), cy: y(s.values[run[0]]), r: 2, fill: s.color }));
                    } else if (run.length > 1) {
                        const points = run.map((i) => x(i).toFixed(1) + ',' + y(s.values[i]).toFixed(1));
                        line += 'M' + points.join('L');
                        area += 'M' + x(run[0]).toFixed(1) + ',' + (margin.top + innerH) + 'L' + points.join('L') + 'L' + x(run[run.length - 1]).toFixed(1) + ',' + (margin.top + innerH) + 'Z';
                    }

                    run = [];
                };

                s.values.forEach((v, i) => (has(v) ? run.push(i) : flush()));
                flush();

                if (config.series.length === 1 && area) {
                    canvas.appendChild(svg('path', { d: area, fill: s.color, 'fill-opacity': 0.1 }));
                }

                if (line) {
                    canvas.appendChild(svg('path', { d: line, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
                }
            });
        }

        const cross = svg('g', { visibility: 'hidden' });
        cross.appendChild(svg('line', { y1: margin.top, y2: margin.top + innerH, stroke: tones.cross, 'stroke-width': 1 }));
        config.series.forEach((s) => cross.appendChild(svg('circle', { r: 4, fill: s.color, stroke: tones.panel, 'stroke-width': 2 })));
        canvas.appendChild(cross);

        const hit = svg('rect', { x: margin.left, y: 0, width: innerW, height, fill: 'transparent' });
        canvas.appendChild(hit);

        figure.textContent = '';
        figure.appendChild(canvas);

        if (dataMax === 0 && !config.series.some((s) => s.values.some(has))) {
            figure.appendChild(el('div', { className: 'dzo-empty', text: 'No samples in this range yet' }));
        }

        const tip = el('div', { className: 'dzo-tip', hidden: true });
        figure.appendChild(tip);

        chart.geometry = { x, y, cross, tip, hit, margin, innerW, count };

        if (chart.index !== null) {
            point(chart, Math.min(chart.index, count - 1));
        }
    }

    function point(chart, index) {
        const g = chart.geometry;
        const config = chart.config;

        if (!g || index === null || index < 0) {
            return hide(chart);
        }

        chart.index = index;
        const px = g.x(index);
        const [line, ...dots] = g.cross.children;

        line.setAttribute('x1', px);
        line.setAttribute('x2', px);
        config.series.forEach((s, i) => {
            const v = s.values[index];
            dots[i].setAttribute('visibility', has(v) ? 'visible' : 'hidden');

            if (has(v)) {
                dots[i].setAttribute('cx', px);
                dots[i].setAttribute('cy', g.y(v));
            }
        });
        g.cross.setAttribute('visibility', 'visible');

        const rows = [el('div', { className: 'dzo-tip-time', text: tipTime(config.t[index], config.bucket) })];

        config.series.forEach((s) => {
            const v = s.values[index];
            const key = el('i');
            key.style.setProperty('--key', s.color);
            rows.push(el('div', { className: 'dzo-tip-row' }, [key, el('b', { text: has(v) ? formatValue(config.kind, v) : 'No data' }), el('span', { text: s.label })]));
        });

        const reporting = config.reporting[index] || 0;

        if (config.nodes > 1 && reporting < config.nodes) {
            rows.push(el('div', { className: 'dzo-tip-note', text: reporting + ' of ' + config.nodes + ' nodes reporting' }));
        }

        g.tip.textContent = '';
        rows.forEach((row) => g.tip.appendChild(row));
        g.tip.hidden = false;

        const width = g.tip.offsetWidth;
        const left = px + 12 + width > chart.figure.clientWidth ? px - 12 - width : px + 12;
        g.tip.style.left = Math.max(4, left) + 'px';
    }

    function hide(chart) {
        chart.index = null;

        if (chart.geometry) {
            chart.geometry.cross.setAttribute('visibility', 'hidden');
            chart.geometry.tip.hidden = true;
        }
    }

    function bindChart(chart) {
        const figure = chart.figure;

        const indexAt = (clientX) => {
            const g = chart.geometry;

            if (!g || g.count === 0) {
                return null;
            }

            const rect = figure.getBoundingClientRect();
            const fraction = (clientX - rect.left - g.margin.left) / g.innerW;

            return Math.max(0, Math.min(g.count - 1, Math.round(fraction * (g.count - 1))));
        };

        figure.addEventListener('pointermove', (event) => point(chart, indexAt(event.clientX)));
        figure.addEventListener('pointerleave', () => document.activeElement !== figure && hide(chart));
        figure.addEventListener('blur', () => hide(chart));
        figure.addEventListener('focus', () => {
            const values = chart.config ? chart.config.series[0].values : [];
            let last = values.length - 1;

            while (last > 0 && !has(values[last])) {
                last--;
            }

            point(chart, last);
        });
        figure.addEventListener('keydown', (event) => {
            const g = chart.geometry;

            if (!g || chart.index === null) {
                return;
            }

            const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -Infinity, End: Infinity };

            if (event.key === 'Escape') {
                hide(chart);
            } else if (event.key in moves) {
                event.preventDefault();
                point(chart, Math.max(0, Math.min(g.count - 1, chart.index + moves[event.key])));
            }
        });
    }


    function donut(data) {
        const figure = root.querySelector('[data-dzo-chart="disk"]');
        const d = data.totals.disk;
        const used = d.used || 0;
        const allocated = Math.max(d.allocated || 0, used);
        const limit = d.limit || 0;
        const total = Math.max(limit, allocated);

        figure.textContent = '';

        if (!(total > 0)) {
            figure.appendChild(el('div', { className: 'dzo-empty', text: 'No disk limit or usage to show yet' }));

            return;
        }

        const parts = [
            { label: 'Used', value: used, color: tones.in },
            { label: 'Allocated, not yet used', value: allocated - used, color: tones.allocated },
            { label: 'Free', value: Math.max(0, limit - allocated), color: tones.free },
        ];
        const size = 168;
        const stroke = 20;
        const r = (size - stroke) / 2;
        const c = 2 * Math.PI * r;
        const centre = size / 2;
        const visible = parts.filter((part) => part.value > 0);
        const ring = svg('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, 'aria-hidden': 'true' });
        const legend = el('div', { className: 'dzo-donut-legend' });
        let offset = 0;

        ring.appendChild(svg('circle', { cx: centre, cy: centre, r, fill: 'none', stroke: tones.ring, 'stroke-width': stroke }));

        parts.forEach((part) => {
            const share = part.value / total;
            const row = el('div', { className: 'dzo-donut-row' }, [
                el('i'),
                el('span', { text: part.label }),
                el('b', { text: fmt.bytes(part.value) }),
                el('em', { text: Math.round(share * 100) + '%' }),
            ]);

            row.firstChild.style.setProperty('--key', part.color);
            legend.appendChild(row);

            if (part.value <= 0) {
                return;
            }

            const length = share * c;
            const drawn = visible.length > 1 ? Math.max(0.5, length - 2) : length;
            const arc = svg('circle', {
                cx: centre, cy: centre, r, fill: 'none', stroke: part.color, 'stroke-width': stroke,
                'stroke-dasharray': drawn.toFixed(2) + ' ' + (c - drawn).toFixed(2),
                'stroke-dashoffset': (-offset).toFixed(2),
                transform: 'rotate(-90 ' + centre + ' ' + centre + ')',
                class: 'dzo-donut-arc',
            });

            offset += length;
            ring.appendChild(arc);

            const show = (on) => {
                row.classList.toggle('is-hover', on);
                arc.classList.toggle('is-hover', on);
            };

            arc.addEventListener('pointerenter', () => show(true));
            arc.addEventListener('pointerleave', () => show(false));
            row.addEventListener('pointerenter', () => show(true));
            row.addEventListener('pointerleave', () => show(false));
        });

        const pct = svg('text', { x: centre, y: centre + 4, 'text-anchor': 'middle', class: 'dzo-donut-pct' });
        pct.textContent = limit > 0 ? Math.round((used / limit) * 100) + '%' : fmt.bytes(used);
        const cap = svg('text', { x: centre, y: centre + 22, 'text-anchor': 'middle', class: 'dzo-donut-cap' });
        cap.textContent = limit > 0 ? 'of the limit used' : 'used';
        ring.appendChild(pct);
        ring.appendChild(cap);

        legend.appendChild(el('div', { className: 'dzo-donut-row is-total' }, [el('span', { text: 'Limit' }), el('b', { text: fmt.bytes(limit) })]));

        if (allocated > limit && limit > 0) {
            legend.appendChild(el('p', { className: 'dzo-donut-note dzo-state-crit', text: 'Allocated is ' + fmt.bytes(allocated - limit) + ' over the limit.' }));
        }

        if (data.totals.online < data.totals.nodes) {
            legend.appendChild(el('p', { className: 'dzo-donut-note', text: 'Used counts the ' + data.totals.online + ' of ' + data.totals.nodes + ' nodes that answered.' }));
        }

        figure.appendChild(el('div', { className: 'dzo-donut' }, [ring, legend]));
    }


    const STATUS_RANK = { unreachable: 0, unknown: 1, online: 2 };

    const SORTS = {
        name: (n) => n.name.toLowerCase(),
        status: (n) => STATUS_RANK[n.status] * 2 + (n.maintenance ? 0 : 1),
        servers: (n) => n.servers.running,
        cpu: (n) => (n.cpu.threads ? (n.cpu.cores || 0) / n.cpu.threads : n.cpu.cores || 0),
        memory: (n) => n.memory.used || 0,
        disk: (n) => n.disk.used || 0,
        network: (n) => (n.network.rx || 0) + (n.network.tx || 0),
        version: (n) => n.version || '',
    };

    function renderNodes(data) {
        const table = $('[data-dzo="nodes-table"]');
        const body = table.querySelector('tbody');
        const { key, dir } = state.sort;
        const rows = data.nodes.slice().sort((a, b) => {
            const va = SORTS[key](a);
            const vb = SORTS[key](b);

            return (va < vb ? -1 : va > vb ? 1 : 0) * dir || a.name.localeCompare(b.name);
        });

        table.querySelectorAll('th button').forEach((button) => {
            if (button.getAttribute('data-sort') === key) {
                button.setAttribute('aria-sort', dir === 1 ? 'ascending' : 'descending');
            } else {
                button.removeAttribute('aria-sort');
            }
        });

        body.textContent = '';

        if (rows.length === 0) {
            body.appendChild(el('tr', {}, [el('td', { colspan: 8, className: 'text-muted', text: 'No nodes to show.' })]));

            return;
        }

        rows.forEach((node) => {
            const online = node.status === 'online';
            const status = node.status === 'unreachable'
                ? badge('Unreachable', 'crit')
                : node.status === 'unknown' ? badge('No data yet', 'idle') : badge('Online', 'good');

            if (node.status === 'unreachable' && node.error) {
                status.title = node.error;
            }

            const usage = (used, of, label) => {
                const fraction = ratio(used, of);
                const tone = online ? toneClass(fraction) : '';

                return el('td', { className: 'dzo-cell' }, [
                    el('span', { className: tone || null, text: online ? label : '–' }),
                    online && fraction !== null ? meter(fraction) : null,
                ]);
            };

            body.appendChild(el('tr', {}, [
                el('td', {}, [flag(node.country), el('strong', { text: node.name }), el('span', { className: 'dzo-sub', text: node.location || '' })]),
                el('td', {}, [status, node.maintenance ? el('span', { className: 'dzo-sub dzo-state-warn', text: 'Maintenance mode' }) : null]),
                el('td', { className: 'dzo-r' }, [
                    el('span', { text: online ? fmt.int(node.servers.running) + ' / ' + fmt.int(node.servers.total) : fmt.int(node.servers.total) }),
                    el('span', { className: 'dzo-sub', text: online ? 'running' + (node.servers.suspended ? ' · ' + node.servers.suspended + ' suspended' : '') : 'state unknown' }),
                ]),
                usage(node.cpu.cores, node.cpu.threads, fmt.cores(node.cpu.cores) + (node.cpu.threads ? ' / ' + node.cpu.threads : '') + ' cores'),
                usage(node.memory.used, node.memory.physical, fmt.bytes(node.memory.used) + (node.memory.physical ? ' / ' + fmt.bytes(node.memory.physical) : '')),
                usage(node.disk.used, node.disk.limit, fmt.bytes(node.disk.used) + (node.disk.limit ? ' / ' + fmt.bytes(node.disk.limit) : '')),
                el('td', { className: 'dzo-r' }, online
                    ? [el('span', { text: 'In ' + fmt.bits(node.network.rx) }), el('span', { className: 'dzo-sub', text: 'Out ' + fmt.bits(node.network.tx) })]
                    : ['–']),
                el('td', {}, [el('span', { className: node.version ? '' : 'dzo-state-faint', text: node.version || '–' })]),
            ]));
        });
    }


    const STATE_TONE = { running: 'good', starting: 'warn', stopping: 'warn', offline: 'idle' };
    const EMPTY_TOP = { overall: 'No server is using anything right now.', cpu: 'No server is using CPU right now.', memory: 'No server is using memory right now.', disk: 'No server is using disk space.', network: 'No server is moving traffic right now.' };

    function renderTop(data) {
        root.querySelectorAll('[data-metric]').forEach((tab) => tab.setAttribute('aria-selected', tab.getAttribute('data-metric') === state.metric ? 'true' : 'false'));

        const body = $('[data-dzo="top-table"] tbody');
        const rows = (data.top && data.top[state.metric]) || [];

        body.textContent = '';

        if (rows.length === 0) {
            body.appendChild(el('tr', {}, [el('td', { colspan: 9, className: 'text-muted', text: data.snapshot_at ? EMPTY_TOP[state.metric] : 'Nothing has been sampled yet.' })]));

            return;
        }

        const key = (metric) => (metric === state.metric ? 'dzo-r is-key' : 'dzo-r');
        const limit = (value, of, format) => (of > 0 ? 'of ' + format(of) : 'no limit');

        rows.forEach((server, i) => {
            const logo = imageUrl(server.logo);
            const link = el('a', { href: '/admin/servers/view/' + Number(server.id) + '/manage', text: server.name, title: 'Manage ' + server.name });
            const cpuTone = toneClass(ratio(server.cpu, server.cpu_limit));
            const memTone = toneClass(ratio(server.memory, server.memory_limit));
            const diskTone = toneClass(ratio(server.disk, server.disk_limit));

            body.appendChild(el('tr', {}, [
                el('td', { className: 'text-muted', text: String(i + 1) }),
                el('td', {}, [el('div', { className: 'dzo-server' }, [
                    logo ? el('img', { className: 'dzo-logo', src: logo, alt: '', width: 34, height: 34, loading: 'lazy', referrerpolicy: 'no-referrer' }) : el('span', { className: 'dzo-logo' }),
                    el('div', {}, [link, el('span', { className: 'dzo-sub', text: server.identifier })]),
                ])]),
                el('td', {}, [flag(server.node_country), server.node || '–']),
                el('td', { text: server.owner || '–' }),
                el('td', {}, [badge(server.state, STATE_TONE[server.state] || 'idle')]),
                el('td', { className: key('cpu') }, [el('span', { className: cpuTone || null, text: server.cpu.toFixed(1) + '%' }), el('span', { className: 'dzo-sub', text: server.cpu_limit > 0 ? 'of ' + server.cpu_limit + '%' : 'no limit' })]),
                el('td', { className: key('memory') }, [el('span', { className: memTone || null, text: fmt.bytes(server.memory) }), el('span', { className: 'dzo-sub', text: limit(server.memory, server.memory_limit, fmt.bytes) })]),
                el('td', { className: key('disk') }, [el('span', { className: diskTone || null, text: fmt.bytes(server.disk) }), el('span', { className: 'dzo-sub', text: limit(server.disk, server.disk_limit, fmt.bytes) })]),
                el('td', { className: key('network') }, ['In ' + fmt.bits(server.rx), el('span', { className: 'dzo-sub', text: 'Out ' + fmt.bits(server.tx) })]),
            ]));
        });
    }


    rangeButtons().forEach((button) => {
        button.addEventListener('click', () => {
            state.range = button.getAttribute('data-range');
            store.set('dzo.range', state.range);

            if (state.data) {
                renderFilters(state.data);
            }

            reload();
        });
    });

    function syncChartKind() {
        chartKindButtons().forEach((button) => {
            button.setAttribute('aria-pressed', button.getAttribute('data-kind') === state.chartKind ? 'true' : 'false');
        });
    }

    chartKindButtons().forEach((button) => {
        button.addEventListener('click', () => {
            const kind = button.getAttribute('data-kind') === 'bars' ? 'bars' : 'line';

            if (kind === state.chartKind) {
                return;
            }

            state.chartKind = kind;
            store.set('dzo.chartkind', kind);
            syncChartKind();
            charts.forEach((chart) => paint(chart));
        });
    });

    syncChartKind();

    root.querySelectorAll('.dzo-kpi-switch').forEach((button, index) => {
        button.addEventListener('click', () => {
            state.kpi[index] = state.kpi[index] ? 0 : 1;
            store.set('dzo.kpi', state.kpi);

            if (state.data) {
                renderKpis(state.data);
            }
        });
    });

    root.querySelectorAll('[data-metric]').forEach((tab) => {
        tab.addEventListener('click', () => {
            state.metric = tab.getAttribute('data-metric');

            if (state.data) {
                renderTop(state.data);
            }
        });
    });

    root.querySelectorAll('[data-dzo="nodes-table"] th button').forEach((button) => {
        button.addEventListener('click', () => {
            const key = button.getAttribute('data-sort');
            const numeric = !['name', 'version', 'status'].includes(key);

            state.sort = state.sort.key === key ? { key, dir: -state.sort.dir } : { key, dir: numeric ? -1 : 1 };

            if (state.data) {
                renderNodes(state.data);
            }
        });
    });

    const picker = page('[data-dzo="nodes"]');

    if (!picker) {
        load();

        return;
    }

    const toggle = picker.querySelector('.dzo-nodes-toggle');
    const panel = picker.querySelector('.dzo-nodes-panel');
    const search = picker.querySelector('.dzo-nodes-search');

    function openPanel(open) {
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');

        if (open && !search.hidden) {
            search.focus();
        }
    }

    toggle.addEventListener('click', () => openPanel(panel.hidden));
    document.addEventListener('click', (event) => !picker.contains(event.target) && openPanel(false));
    picker.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            openPanel(false);
            toggle.focus();
        }
    });

    search.addEventListener('input', () => {
        const term = search.value.trim().toLowerCase();

        panel.querySelectorAll('.dzo-nodes-list .dz-check').forEach((label) => {
            label.hidden = term !== '' && !label.classList.contains('dzo-nodes-all') && !label.getAttribute('data-name').includes(term);
        });
    });

    panel.addEventListener('change', (event) => {
        const input = event.target;

        if (!(input instanceof HTMLInputElement)) {
            return;
        }

        if (input.value === 'all') {
            state.nodes = [];
        } else {
            const id = Number(input.value);
            const next = new Set(state.nodes);

            if (input.checked) {
                next.add(id);
            } else {
                next.delete(id);
            }

            state.nodes = Array.from(next).sort((a, b) => a - b);
        }

        store.set('dzo.nodes', state.nodes);

        if (state.data) {
            renderFilters(state.data);
        }

        reload();
    });

    load();
})();
