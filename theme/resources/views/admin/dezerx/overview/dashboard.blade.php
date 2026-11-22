
<style>
    .dzo, .dzo-controls { --dzo-panel: var(--sa-well, #1f2933); --dzo-rule: var(--sa-line, #4d5b69); --dzo-grid: var(--sa-grid, rgba(202, 209, 216, .09)); --dzo-text: var(--sa-ink, #cad1d8); --dzo-strong: var(--sa-strong, #eef1f4);
           --dzo-muted: var(--sa-muted, #9aa5b1); --dzo-faint: var(--sa-faint, #6f7c89); --dzo-in: var(--sa-chart-1, #3987e5); --dzo-out: #d95926; --dzo-warn: var(--sa-warning, #fab219); --dzo-crit: var(--sa-danger, #d03b3b);
           }
    .dzo { color: var(--dzo-text); margin-bottom: 18px; }
    .dzo .box { margin-bottom: 16px; }
    .dzo-num, .dzo table td, .dzo-axis { font-variant-numeric: tabular-nums; }

    .dzo-sysinfo { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; }
    .dzo-sysinfo::before, .dzo-sysinfo::after { display: none; }
    .dzo-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-left: auto; }
    .dzo-updated:not(:empty)::before { content: ' · '; }

    .dzo-seg { display: inline-flex; border: 1px solid var(--dzo-rule); border-radius: 4px; overflow: hidden; }
    .dzo-seg button { background: var(--dzo-panel); color: var(--dzo-muted); border: 0; border-left: 1px solid var(--dzo-rule); padding: 5px 12px; font-size: 12px; font-weight: 600; letter-spacing: .02em; transition: color .12s ease, background-color .12s ease; }
    .dzo-seg button:first-child { border-left: 0; }
    .dzo-seg button:hover { color: var(--dzo-text); background: var(--sa-well-hover, #26313c); }
    .dzo-seg button[aria-pressed="true"], .dzo-seg button[aria-selected="true"] { background: var(--sa-accent, #0967d3); color: var(--sa-on-accent, #fff); }
    .dzo-seg button:focus-visible, .dzo-nodes-toggle:focus-visible, .dzo-kpi-switch:focus-visible, .dzo th button:focus-visible { outline: 2px solid var(--sa-accent, #0967d3); outline-offset: 1px; position: relative; }

    .dzo-nodes { position: relative; }
    .dzo-nodes-toggle { background: var(--dzo-panel); color: var(--dzo-text); border: 1px solid var(--dzo-rule); border-radius: 4px; padding: 5px 30px 5px 11px; font-size: 12px; font-weight: 600; min-width: 150px; text-align: left; position: relative; }
    .dzo-nodes-toggle::after { content: ''; position: absolute; right: 11px; top: 50%; margin-top: -3px; border: 4px solid transparent; border-top-color: var(--dzo-muted); }
    .dzo-nodes-panel { position: absolute; right: 0; top: calc(100% + 4px); z-index: 30; width: 280px; background: var(--dzo-panel); border: 1px solid var(--dzo-rule); border-radius: 4px; box-shadow: 0 8px 24px rgba(0, 0, 0, .35); }
    .dzo-nodes-panel[hidden] { display: none; }
    .dzo-nodes-search { display: block; width: 100%; background: var(--sa-well-hover, #2b3540); border: 0; border-bottom: 1px solid var(--dzo-rule); color: var(--dzo-text); padding: 8px 12px; font-size: 13px; outline: 0; }
    .dzo-nodes-list { max-height: 300px; overflow: auto; padding: 8px 12px 4px; }
    .dzo-nodes-list .dz-check { display: flex; margin: 0 0 8px; }
    .dzo-nodes-search[hidden], .dzo-nodes-list .dz-check[hidden] { display: none; }
    .dzo-nodes-list .dz-check-text small { margin-left: 4px; }
    .dzo-nodes-all { border-bottom: 1px solid var(--dzo-rule); padding-bottom: 8px; margin-bottom: 8px !important; }

    .dz-check { display: inline-flex; align-items: center; gap: 9px; margin: 0 0 6px; font-weight: 400; color: var(--sa-ink, #cad1d8); cursor: pointer; }
    .dz-check input { position: absolute; opacity: 0; width: 0; height: 0; }
    .dz-check-box { position: relative; flex: 0 0 auto; width: 18px; height: 18px; border-radius: 5px; background: var(--sa-field, #515f6cbb); box-shadow: inset 0 0 0 1px var(--sa-field-edge, #606d7b); transition: background-color .15s ease, box-shadow .15s ease; }
    .dz-check-box::after { content: ''; position: absolute; top: 3px; left: 6px; width: 4px; height: 8px; border: solid var(--sa-on-accent, #fff); border-width: 0 2px 2px 0; transform: rotate(45deg) scale(.4); opacity: 0; transition: transform .15s ease, opacity .15s ease; }
    .dz-check:hover .dz-check-box { box-shadow: inset 0 0 0 1px var(--sa-field-hover, #7b8794); }
    .dz-check input:checked + .dz-check-box { background: var(--sa-accent, #0967d3); box-shadow: inset 0 0 0 1px var(--sa-accent, #0967d3); }
    .dz-check input:checked + .dz-check-box::after { transform: rotate(45deg) scale(1); opacity: 1; }
    .dz-check input:focus-visible + .dz-check-box { box-shadow: inset 0 0 0 1px var(--sa-accent, #0967d3), 0 0 0 3px var(--sa-ring, rgba(9, 103, 211, .35)); }
    .dz-check-text small { color: var(--sa-muted, #9aa5b1); }

    .dzo-notice { border-left: 3px solid var(--dzo-warn); background: var(--dzo-panel); padding: 9px 14px; margin: 0 0 14px; font-size: 13px; }
    .dzo-notice[hidden] { display: none; }

    .dzo-kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .dzo-kpi { padding: 18px 20px 17px; border-left: 1px solid var(--dzo-rule); min-width: 0; }
    .dzo-kpi:first-child { border-left: 0; }
    .dzo-kpi-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 0 0 8px; }
    .dzo-kpi-label { font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--dzo-muted); margin: 0; }
    .dzo-kpi-switch { flex: 0 0 auto; background: none; border: 0; padding: 3px; margin: -3px -3px -3px 0; line-height: 0; border-radius: 3px; color: var(--dzo-faint); transition: color .12s ease, background-color .12s ease; }
    .dzo-kpi-switch:hover { color: var(--dzo-text); background: var(--sa-hover, rgba(202, 209, 216, .08)); }
    .dzo-kpi-value { font-size: 26px; line-height: 1.1; font-weight: 600; color: var(--dzo-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dzo-kpi-value small { font-size: 13px; font-weight: 400; color: var(--dzo-muted); margin-left: 4px; }
    .dzo-kpi-meter { height: 4px; border-radius: 2px; background: var(--sa-track, rgba(202, 209, 216, .12)); margin: 12px 0 10px; overflow: hidden; }
    .dzo-kpi-meter i { display: block; height: 100%; border-radius: 2px; background: var(--dzo-in); transition: width .3s ease; }
    .dzo-kpi-meter i.is-warn { background: var(--dzo-warn); }
    .dzo-kpi-meter i.is-crit { background: var(--dzo-crit); }
    .dzo-kpi-meter.is-none { visibility: hidden; }
    .dzo-kpi-sub { font-size: 13px; color: var(--dzo-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dzo-kpi-sub.is-alt { color: var(--dzo-muted); }
    @media (max-width: 1200px) { .dzo-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } .dzo-kpi:nth-child(4) { border-left: 0; } .dzo-kpi:nth-child(n+4) { border-top: 1px solid var(--dzo-rule); } }
    @media (max-width: 640px) { .dzo-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dzo-kpi { border-left: 0; border-top: 1px solid var(--dzo-rule); } .dzo-kpi:nth-child(even) { border-left: 1px solid var(--dzo-rule); } .dzo-kpi:nth-child(-n+2) { border-top: 0; } }

    .dzo-charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 16px; }
    .dzo-charts .box { margin: 0; }
    @media (max-width: 992px) { .dzo-charts { grid-template-columns: minmax(0, 1fr); } }
    .dzo-chart-head { display: flex; align-items: baseline; gap: 12px; }
    .dzo-chart-head .box-title { font-size: 14px; }
    .dzo-chart-now { margin-left: auto; font-size: 13px; color: var(--dzo-muted); white-space: nowrap; }
    .dzo-chart-now b { color: var(--dzo-strong); font-weight: 600; }
    .dzo-legend { display: inline-flex; gap: 14px; font-size: 12px; color: var(--dzo-muted); }
    .dzo-legend span::before { content: ''; display: inline-block; width: 12px; height: 2px; margin: 0 6px 3px 0; vertical-align: middle; background: var(--key); }
    .dzo-chart { position: relative; height: 224px; background: var(--dzo-panel); margin: 0; outline: 0; }
    .dzo-chart:focus-visible { box-shadow: inset 0 0 0 2px var(--sa-accent, #0967d3); }
    .dzo-chart svg { display: block; width: 100%; height: 100%; }
    .dzo-axis { fill: var(--dzo-faint); font-size: 11px; }
    .dzo-ref { fill: var(--dzo-muted); font-size: 11px; }
    .dzo-donut { display: flex; align-items: center; gap: 28px; height: 100%; padding: 0 24px; }
    .dzo-chart .dzo-donut svg { flex: 0 0 auto; width: 168px; height: 168px; }
    .dzo-donut-arc { transition: stroke-width .12s ease; cursor: default; }
    .dzo-donut-arc.is-hover { stroke-width: 24px; }
    .dzo-donut-pct { fill: var(--dzo-strong); font-size: 26px; font-weight: 600; }
    .dzo-donut-cap { fill: var(--dzo-muted); font-size: 11px; }
    .dzo-donut-legend { flex: 1 1 auto; min-width: 0; font-size: 13px; }
    .dzo-donut-row { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 3px; }
    .dzo-donut-row + .dzo-donut-row { border-top: 1px solid var(--sa-line, rgba(202, 209, 216, .07)); }
    .dzo-donut-row.is-hover { background: var(--sa-hover, rgba(202, 209, 216, .06)); }
    .dzo-donut-row i { flex: 0 0 auto; width: 10px; height: 10px; border-radius: 2px; background: var(--key); }
    .dzo-donut-row span { flex: 1 1 auto; min-width: 0; color: var(--dzo-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dzo-donut-row b { color: var(--dzo-strong); font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .dzo-donut-row em { flex: 0 0 38px; font-style: normal; text-align: right; color: var(--dzo-faint); font-variant-numeric: tabular-nums; }
    .dzo-donut-row.is-total span { color: var(--dzo-text); }
    .dzo-donut-row.is-total b { margin-right: 48px; }
    .dzo-donut-note { margin: 8px 8px 0; font-size: 12px; color: var(--dzo-faint); }
    @media (max-width: 480px) { .dzo-donut { gap: 14px; padding: 0 10px; } .dzo-chart .dzo-donut svg { width: 120px; height: 120px; } }
    .dzo-empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; color: var(--dzo-muted); }
    .dzo-tip { position: absolute; top: 8px; z-index: 5; pointer-events: none; min-width: 150px; background: var(--sa-pop, #151c23); border: 1px solid var(--dzo-rule); border-radius: 4px; padding: 7px 10px; font-size: 12px; box-shadow: 0 6px 18px rgba(0, 0, 0, .35); }
    .dzo-tip[hidden] { display: none; }
    .dzo-tip-time { color: var(--dzo-muted); margin-bottom: 4px; }
    .dzo-tip-row { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
    .dzo-tip-row i { width: 12px; height: 2px; background: var(--key); flex: 0 0 auto; }
    .dzo-tip-row b { color: var(--dzo-strong); font-weight: 600; }
    .dzo-tip-row span { color: var(--dzo-muted); }
    .dzo-tip-note { color: var(--dzo-faint); margin-top: 4px; }

    .dzo table { margin: 0; }
    .dzo table th { font-size: 12px; font-weight: 600; color: var(--dzo-muted); white-space: nowrap; }
    .dzo table th button { background: none; border: 0; padding: 0; color: inherit; font: inherit; }
    .dzo table th button[aria-sort]::after { content: ''; display: inline-block; margin-left: 5px; border: 4px solid transparent; vertical-align: 1px; }
    .dzo table th button[aria-sort="ascending"]::after { border-bottom-color: currentColor; vertical-align: 3px; }
    .dzo table th button[aria-sort="descending"]::after { border-top-color: currentColor; vertical-align: -1px; }
    .dzo table td { vertical-align: middle !important; font-size: 13px; }
    .dzo table .dzo-r { text-align: right; }
    .dzo-sub { display: block; font-size: 11px; color: var(--dzo-faint); }
    .dzo-cell { min-width: 120px; }
    .dzo-meter { height: 3px; background: var(--sa-track, rgba(202, 209, 216, .12)); margin-top: 5px; }
    .dzo-meter i { display: block; height: 100%; background: var(--dzo-in); }
    .dzo-meter i.is-warn { background: var(--dzo-warn); }
    .dzo-meter i.is-crit { background: var(--dzo-crit); }
    .dzo-state-crit { color: var(--sa-danger, #f08080); }
    .dzo-state-warn { color: var(--dzo-warn); }
    .dzo-state-faint { color: var(--dzo-faint); }
    .dzo a.dzo-link { color: var(--dzo-strong); font-weight: 600; }
    .dzo a.dzo-link:hover { text-decoration: underline; }
    .dzo td.is-key { color: var(--dzo-strong); font-weight: 600; }
    .dzo-scroll { overflow-x: auto; }

    .dzo-server { display: flex; align-items: center; gap: 11px; min-width: 200px; }
    .dzo-logo { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 6px; object-fit: cover; background: var(--sa-well-hover, #2b3540); box-shadow: 0 0 0 1px rgba(0, 0, 0, .25); }
    .dzo-server a { color: var(--sa-accent, #4d9ff2); font-weight: 600; text-decoration: underline; text-decoration-color: var(--sa-ring, rgba(77, 159, 242, .55)); text-underline-offset: 3px; }
    .dzo-server a:hover { color: var(--sa-accent-hover, #7ab8f6); text-decoration-color: currentColor; }
    .dzo-flag { width: 18px; height: 13px; margin-right: 7px; vertical-align: -1px; border-radius: 2px; object-fit: cover; box-shadow: 0 0 0 1px rgba(0, 0, 0, .3); }
    .dzo-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; line-height: 1.5; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
    .dzo-badge.is-good { background: var(--sa-good-bg, #0ca30c); color: var(--sa-good-ink, #fff); }
    .dzo-badge.is-warn { background: var(--sa-warn-bg, #fab219); color: var(--sa-warn-ink, #1f2933); }
    .dzo-badge.is-crit { background: var(--sa-crit-bg, #d03b3b); color: var(--sa-crit-ink, #fff); }
    .dzo-badge.is-idle { background: var(--sa-idle-bg, #56636f); color: var(--sa-idle-ink, #e6eaee); }

    .dzo.is-loading .dzo-chart svg, .dzo.is-loading .dzo-kpis, .dzo.is-loading table { opacity: .55; transition: opacity .15s ease; }
</style>

<div class="dzo" id="dzo" data-endpoint="{{ route('admin.dezerx.overview.data') }}">
    <div class="dzo-notice" data-dzo="notice" role="status" hidden></div>

    <div class="box dzo-kpis" data-dzo="kpis" aria-live="polite">
        @foreach (['Servers', 'CPU', 'Memory', 'Disk', 'Network', 'Bandwidth'] as $label)
            <div class="dzo-kpi">
                <div class="dzo-kpi-head">
                    <p class="dzo-kpi-label">{{ $label }}</p>
                    <button type="button" class="dzo-kpi-switch" title="Switch detail" aria-label="Show the other {{ strtolower($label) }} detail">
                        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2.5 5.5h10m-3-3 3 3-3 3m4 2.5h-10m3-3-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                </div>
                <div class="dzo-kpi-value">–</div>
                <div class="dzo-kpi-meter is-none" role="presentation"><i></i></div>
                <div class="dzo-kpi-sub" aria-live="polite">&nbsp;</div>
            </div>
        @endforeach
    </div>

    <div class="dzo-charts">
        @foreach (['cpu' => 'CPU', 'memory' => 'Memory', 'disk' => 'Disk', 'network' => 'Network'] as $key => $title)
            <div class="box">
                <div class="box-header with-border dzo-chart-head">
                    <h3 class="box-title">{{ $title }}</h3>
                    @if ($key === 'network')
                        <span class="dzo-legend"><span style="--key: var(--dzo-in)">In</span><span style="--key: var(--dzo-out)">Out</span></span>
                    @endif
                    <span class="dzo-chart-now" data-dzo-now="{{ $key }}"></span>
                </div>
                @if ($key === 'disk')
                    <figure class="dzo-chart" data-dzo-chart="disk" aria-label="Disk use against the limit"></figure>
                @else
                    <figure class="dzo-chart" data-dzo-chart="{{ $key }}" tabindex="0" aria-label="{{ $title }} over the selected time range. Use the arrow keys to read values."></figure>
                @endif
            </div>
        @endforeach
    </div>

    <div class="box">
        <div class="box-header with-border">
            <h3 class="box-title">Nodes</h3>
        </div>
        <div class="box-body no-padding dzo-scroll">
            <table class="table table-hover" data-dzo="nodes-table">
                <thead>
                    <tr>
                        <th><button type="button" data-sort="name">Node</button></th>
                        <th><button type="button" data-sort="status">Status</button></th>
                        <th class="dzo-r"><button type="button" data-sort="servers">Servers</button></th>
                        <th><button type="button" data-sort="cpu">CPU</button></th>
                        <th><button type="button" data-sort="memory">Memory</button></th>
                        <th><button type="button" data-sort="disk">Disk</button></th>
                        <th class="dzo-r"><button type="button" data-sort="network">Network</button></th>
                        <th><button type="button" data-sort="version">Wings</button></th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>

    <div class="box">
        <div class="box-header with-border" style="display:flex;align-items:center">
            <h3 class="box-title">Busiest servers</h3>
            <div class="dzo-seg" role="tablist" aria-label="Rank by" data-dzo="tabs" style="margin-left:auto">
                <button type="button" role="tab" data-metric="overall" aria-selected="true">Overall</button>
                <button type="button" role="tab" data-metric="cpu" aria-selected="false">CPU</button>
                <button type="button" role="tab" data-metric="memory" aria-selected="false">Memory</button>
                <button type="button" role="tab" data-metric="disk" aria-selected="false">Disk</button>
                <button type="button" role="tab" data-metric="network" aria-selected="false">Network</button>
            </div>
        </div>
        <div class="box-body no-padding dzo-scroll">
            <table class="table table-hover" data-dzo="top-table">
                <thead>
                    <tr>
                        <th style="width:36px">#</th>
                        <th>Server</th>
                        <th>Node</th>
                        <th>Owner</th>
                        <th>State</th>
                        <th class="dzo-r">CPU</th>
                        <th class="dzo-r">Memory</th>
                        <th class="dzo-r">Disk</th>
                        <th class="dzo-r">Network</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    </div>
</div>

<script src="{{ asset('dezerx/admin/overview.js') }}?v={{ @filemtime(public_path('dezerx/admin/overview.js')) }}" defer></script>
