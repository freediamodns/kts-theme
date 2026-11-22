
<div class="dzo-controls">
    <div class="dzo-seg" role="group" aria-label="Time range" data-dzo="range">
        <button type="button" data-range="1h" aria-pressed="false">1H</button>
        <button type="button" data-range="6h" aria-pressed="false">6H</button>
        <button type="button" data-range="24h" aria-pressed="false">24H</button>
        <button type="button" data-range="7d" aria-pressed="false">7D</button>
        <button type="button" data-range="30d" aria-pressed="false">30D</button>
        <button type="button" data-range="90d" aria-pressed="false" title="3 months">3M</button>
        <button type="button" data-range="180d" aria-pressed="false" title="6 months">6M</button>
        <button type="button" data-range="1y" aria-pressed="false" title="1 year">1Y</button>
        <button type="button" data-range="all" aria-pressed="false" title="Everything recorded">Lifetime</button>
    </div>
    <div class="dzo-seg" role="group" aria-label="Chart type" data-dzo="chartkind">
        <button type="button" data-kind="line" aria-pressed="true" title="Line charts">Line</button>
        <button type="button" data-kind="bars" aria-pressed="false" title="Bar charts">Bars</button>
    </div>
    <div class="dzo-nodes" data-dzo="nodes">
        <button type="button" class="dzo-nodes-toggle" aria-haspopup="true" aria-expanded="false">All nodes</button>
        <div class="dzo-nodes-panel" hidden>
            <input type="search" class="dzo-nodes-search" placeholder="Find a node" aria-label="Find a node" hidden />
            <div class="dzo-nodes-list"></div>
        </div>
    </div>
</div>
