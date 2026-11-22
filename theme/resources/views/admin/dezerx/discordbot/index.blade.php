@extends('layouts.admin')

@section('title')
    Discord Bot
@endsection

@section('content-header')
    <h1>Discord Bot<small>A remote control for the panel, inside Discord.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.dezerx.addons') }}">KTS Host Addons</a></li>
        <li class="active">Discord Bot</li>
    </ol>
@endsection

@section('content')
@php
    $isGlobal = $settings['mode'] === 'global';
    $commandsOn = count($catalogue) - count($settings['disabled']);
    $activeKeys = $members->filter(fn ($member) => $member->apiKey !== null)->count();
    $failingAlerts = $alerts->filter(fn ($alert) => (bool) $alert->last_error)->count();
    $canOAuth = $global !== null && $global->canOAuth();
    $nestsWithEggs = $nests->filter(fn ($nest) => $nest->eggs->isNotEmpty());
    $scopeParts = array_filter([
        $settings['eggs'] === [] ? null : count($settings['eggs']) . ' ' . (count($settings['eggs']) === 1 ? 'egg' : 'eggs'),
        $settings['nodes'] === [] ? null : count($settings['nodes']) . ' ' . (count($settings['nodes']) === 1 ? 'node' : 'nodes'),
    ]);
    $scope = $scopeParts === [] ? 'Every server' : implode(' · ', $scopeParts);
    $sync = match (true) {
        $global === null => null,
        !$isGlobal => ['idle', 'Idle'],
        (bool) $global->commands_error => ['crit', 'Sync failed'],
        $globalCurrent => ['good', 'In sync'],
        default => ['warn', 'Out of date'],
    };
    $commandIcons = ['servers' => 'server', 'controlpanel' => 'sliders', 'power' => 'power-off', 'command' => 'terminal', 'backups' => 'archive', 'connect' => 'link', 'activity' => 'history', 'billing' => 'credit-card', 'alerts' => 'bell', 'account' => 'user', 'unlink' => 'chain-broken', 'help' => 'life-ring'];
    $barLabels = ['squares' => '🟩🟩🟩⬛⬛ Squares', 'circles' => '🟢🟢🟢⚫⚫ Circles', 'blocks' => '███░░ Blocks'];
@endphp
<style>
    .dzb { --dzb-panel: var(--sa-well, #1f2933); --dzb-rule: var(--sa-line, #4d5b69); --dzb-text: var(--sa-ink, #cad1d8); --dzb-strong: var(--sa-strong, #eef1f4); --dzb-muted: var(--sa-muted, #9aa5b1); --dzb-faint: var(--sa-faint, #6f7c89); --dzb-blue: var(--sa-accent, #0967d3); color: var(--dzb-text); }
    .dzb .box { margin-bottom: 16px; }
    .dzb .box-body { padding: 16px 18px; }
    .dzb .table { margin: 0; }
    .dzb .table th { font-size: 12px; font-weight: 600; color: var(--dzb-muted); white-space: nowrap; }
    .dzb .table td { vertical-align: middle !important; font-size: 13px; }
    .dzb .table th:first-child, .dzb .table td:first-child { padding-left: 18px; }
    .dzb .table th:last-child, .dzb .table td:last-child { padding-right: 18px; }
    .dzb code { background: var(--sa-code, rgba(0, 0, 0, .22)); color: var(--dzb-strong); padding: 1px 5px; border-radius: 3px; font-size: 12px; }
    .dzb small code, .dzb .dzb-note code { padding: 0 4px; font-size: 11px; }
    .dz-check-text code, .dzb-cmd code { white-space: nowrap; }
    .dzb a:not(.btn) { color: var(--sa-accent, #4d9ff2); }
    .dzb a:not(.btn):hover { color: var(--sa-accent-hover, #7ab8f6); }
    .dzb .form-group { margin-bottom: 0; }
    .dzb .control-label { font-weight: 600; color: var(--dzb-text); margin-bottom: 6px; }

    .dzb-head { display: flex; align-items: center; gap: 10px; }
    .dzb-head::before, .dzb-head::after { display: none; }
    .dzb-tools { margin-left: auto; display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--dzb-muted); }
    .dzb-label { display: block; font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--dzb-muted); margin: 0 0 10px; }
    .dzb-note { margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: var(--dzb-muted); }
    .dzb-sub { display: block; font-size: 11px; color: var(--dzb-faint); }
    .dzb-crit { color: var(--sa-danger, #f08080); }
    .dzb-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 32px; }
    @media (max-width: 992px) { .dzb-cols { grid-template-columns: minmax(0, 1fr); } }
    .dzb-stack { display: flex; flex-direction: column; gap: 22px; min-width: 0; }

    .dzb-kpis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .dzb-kpi { padding: 18px 20px 17px; border-left: 1px solid var(--dzb-rule); min-width: 0; }
    .dzb-kpi:first-child { border-left: 0; }
    .dzb-kpi-label { font-size: 11px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: var(--dzb-muted); margin: 0 0 8px; }
    .dzb-kpi-value { font-size: 24px; line-height: 1.15; font-weight: 600; color: var(--dzb-strong); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .dzb-kpi-value small { font-size: 13px; font-weight: 400; color: var(--dzb-muted); margin-left: 4px; }
    .dzb-kpi-value.is-good { color: var(--sa-success, #3fcf3f); }
    .dzb-kpi-value.is-crit { color: var(--sa-danger, #f08080); }
    .dzb-kpi-sub { margin-top: 6px; font-size: 13px; color: var(--dzb-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 1200px) { .dzb-kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } .dzb-kpi:nth-child(4) { border-left: 0; } .dzb-kpi:nth-child(n+4) { border-top: 1px solid var(--dzb-rule); } }
    @media (max-width: 640px) { .dzb-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dzb-kpi { border-left: 0; border-top: 1px solid var(--dzb-rule); } .dzb-kpi:nth-child(even) { border-left: 1px solid var(--dzb-rule); } .dzb-kpi:nth-child(-n+2) { border-top: 0; } }

    .dzb-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 700; line-height: 1.5; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; vertical-align: 1px; }
    .dzb-badge.is-good { background: var(--sa-good-bg, #0ca30c); color: var(--sa-good-ink, #fff); }
    .dzb-badge.is-warn { background: var(--sa-warn-bg, #fab219); color: var(--sa-warn-ink, #1f2933); }
    .dzb-badge.is-crit { background: var(--sa-crit-bg, #d03b3b); color: var(--sa-crit-ink, #fff); }
    .dzb-badge.is-idle { background: var(--sa-idle-bg, #56636f); color: var(--sa-idle-ink, #e6eaee); }

    .dzb-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--dzb-rule); border-radius: 4px; overflow: hidden; }
    .dzb-seg label, .dzb-seg button { margin: 0; background: var(--dzb-panel); color: var(--dzb-muted); border: 0; border-left: 1px solid var(--dzb-rule); padding: 6px 14px; font-size: 12px; font-weight: 600; letter-spacing: .02em; cursor: pointer; transition: color .12s ease, background-color .12s ease; }
    .dzb-seg label:first-child, .dzb-seg button:first-child { border-left: 0; }
    .dzb-seg label:hover, .dzb-seg button:hover { color: var(--dzb-text); background: var(--sa-well-hover, #26313c); }
    .dzb-seg label.is-on, .dzb-seg button.is-on { background: var(--dzb-blue); color: var(--sa-on-accent, #fff); }
    .dzb-seg input { position: absolute; opacity: 0; width: 0; height: 0; }
    .dzb-seg label:has(input:focus-visible), .dzb-seg button:focus-visible { outline: 2px solid var(--dzb-blue); outline-offset: 1px; position: relative; }
    .dzb-hint[hidden], .dzb-seg[hidden] { display: none; }

    .dz-switch { display: flex; align-items: flex-start; gap: 12px; margin: 0; padding: 0; border: 0; background: transparent; cursor: pointer; font-weight: 400; color: var(--dzb-text); }
    .dz-switch:hover .dz-switch-text strong { color: var(--sa-strong, #fff); }
    .dz-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
    .dz-switch-track { position: relative; flex: 0 0 auto; width: 42px; height: 24px; border-radius: 999px; background: var(--sa-field-edge, #606d7b); transition: background-color .18s ease; }
    .dz-switch-track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, .3); transition: transform .18s ease; }
    .dz-switch input:checked + .dz-switch-track { background: var(--dzb-blue); }
    .dz-switch input:checked + .dz-switch-track::after { transform: translateX(18px); }
    .dz-switch input:focus-visible + .dz-switch-track { box-shadow: 0 0 0 3px var(--sa-ring, rgba(9, 103, 211, .35)); }
    .dz-switch-text { line-height: 1.4; padding-top: 2px; }
    .dz-switch-text strong { display: block; color: var(--dzb-strong); font-weight: 600; }
    .dz-switch-text small { display: block; margin-top: 3px; font-size: 12px; color: var(--dzb-muted); }

    .dz-check { display: inline-flex; align-items: flex-start; gap: 9px; margin: 0 0 8px; font-weight: 400; color: var(--dzb-text); cursor: pointer; }
    .dz-check input { position: absolute; opacity: 0; width: 0; height: 0; }
    .dz-check-box { position: relative; flex: 0 0 auto; width: 18px; height: 18px; margin-top: 1px; border-radius: 5px; background: var(--sa-field, #515f6cbb); box-shadow: inset 0 0 0 1px var(--sa-field-edge, #606d7b); transition: background-color .15s ease, box-shadow .15s ease; }
    .dz-check-box::after { content: ''; position: absolute; top: 3px; left: 6px; width: 4px; height: 8px; border: solid var(--sa-on-accent, #fff); border-width: 0 2px 2px 0; transform: rotate(45deg) scale(.4); opacity: 0; transition: transform .15s ease, opacity .15s ease; }
    .dz-check:hover .dz-check-box { box-shadow: inset 0 0 0 1px var(--sa-field-hover, #7b8794); }
    .dz-check input:checked + .dz-check-box { background: var(--dzb-blue); box-shadow: inset 0 0 0 1px var(--dzb-blue); }
    .dz-check input:checked + .dz-check-box::after { transform: rotate(45deg) scale(1); opacity: 1; }
    .dz-check input:disabled + .dz-check-box { opacity: .45; cursor: not-allowed; }
    .dz-check input:focus-visible + .dz-check-box { box-shadow: inset 0 0 0 1px var(--dzb-blue), 0 0 0 3px var(--sa-ring, rgba(9, 103, 211, .35)); }
    .dz-check-text { min-width: 0; line-height: 1.4; }
    .dz-check-text small { display: block; font-size: 12px; color: var(--dzb-muted); }
    .dz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 0 18px; }
    .dz-grid.is-wide { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 6px 22px; }
    .dz-picks { max-height: 280px; overflow-y: auto; padding-right: 4px; }
    .dz-picks .dz-nest { margin: 14px 0 8px; font-size: 12px; font-weight: 600; color: var(--dzb-muted); }
    .dz-picks .dz-nest:first-child { margin-top: 0; }
    .dz-pick-head { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .dz-pick-head .dzb-label { margin: 0; }
    .dz-pick-head a { font-size: 12px; cursor: pointer; }
    .dz-pick-head a:first-of-type { margin-left: auto; }

    .dzb-savebar { position: sticky; bottom: 12px; z-index: 20; display: flex; align-items: center; gap: 12px; background: var(--dzb-panel); border-radius: 4px; padding: 10px 12px 10px 16px; margin: 0 0 16px; box-shadow: 0 6px 20px rgba(0, 0, 0, .35); font-size: 12px; color: var(--dzb-muted); }
    .dzb-savebar .btn { margin-left: auto; }

    .dzb-identity { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 20px; }
    .dzb-identity img { width: 48px; height: 48px; border-radius: 10px; box-shadow: 0 0 0 1px rgba(0, 0, 0, .25); }
    .dzb-identity strong { display: block; font-size: 16px; color: var(--dzb-strong); }
    .dzb-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-left: auto; }
    .dzb-actions form { margin: 0; }
    .dzb-actions .btn-link { color: var(--sa-danger, #f08080); }
    .dzb-copy { display: flex; gap: 6px; }
    .dzb-copy input[type=text] { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .dzb-steps { counter-reset: dzb; list-style: none; padding: 0; margin: 0; }
    .dzb-steps li { counter-increment: dzb; position: relative; padding: 2px 0 14px 38px; line-height: 1.5; }
    .dzb-steps li:last-child { padding-bottom: 0; }
    .dzb-steps li::before { content: counter(dzb); position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--dzb-blue); color: var(--sa-on-accent, #fff); font-size: 12px; font-weight: 700; text-align: center; line-height: 24px; }

    .dzb-who { display: flex; align-items: center; gap: 10px; }
    .dzb-who img { flex: 0 0 auto; width: 28px; height: 28px; border-radius: 50%; background: var(--sa-well-hover, #2b3540); }
    .dzb-who img.is-square { border-radius: 6px; }
    .dzb-empty { text-align: center; color: var(--dzb-muted); padding: 22px 18px !important; }

    .dzb-design { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 28px; align-items: start; }
    @media (max-width: 992px) { .dzb-design { grid-template-columns: minmax(0, 1fr); } }
    .dzb-cmd { margin-bottom: 18px !important; }
    .dzb-cmd tr:first-child td { border-top: 0; }
    .dzb-cmd td { padding: 7px 6px !important; }
    .dzb-cmd .dzb-icon { width: 18px; display: inline-block; text-align: center; color: var(--dzb-muted); }
    .dzb-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; margin-bottom: 18px; }
    .dzb-switches { display: grid; gap: 14px; margin-bottom: 18px; }
    .dzb-stage { position: sticky; top: 16px; }
    .dzb-tabs { margin-bottom: 12px; }
    .dzb-stage-inner { background: #1a1a1e; border-radius: 6px; min-height: 200px; overflow: hidden; }
    .dzb-stage .dzb-loading { opacity: .55; transition: opacity .15s; }
    {!! $previewCss !!}
</style>

<div class="dzb">
    <div class="box dzb-kpis">
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Bot</p>
            <div class="dzb-kpi-value {{ $enabled ? 'is-good' : 'is-crit' }}">{{ $enabled ? 'On' : 'Off' }}</div>
            <div class="dzb-kpi-sub">{{ $enabled ? 'Answering commands' : 'Every command says so' }}</div>
        </div>
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Mode</p>
            <div class="dzb-kpi-value">{{ $isGlobal ? 'Panel-wide' : 'Own bots' }}</div>
            <div class="dzb-kpi-sub">{{ $isGlobal ? 'One bot for everybody' : 'Customers bring their own' }}</div>
        </div>
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Panel bot</p>
            <div class="dzb-kpi-value">{{ $global === null ? 'Not connected' : $global->name }}</div>
            <div class="dzb-kpi-sub">{{ $sync === null ? 'Connect it below' : 'Commands: ' . strtolower($sync[1]) }}</div>
        </div>
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Commands</p>
            <div class="dzb-kpi-value">{{ $commandsOn }}<small>of {{ count($catalogue) }}</small></div>
            <div class="dzb-kpi-sub">Switched on panel-wide</div>
        </div>
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Linked accounts</p>
            <div class="dzb-kpi-value">{{ $members->count() }}</div>
            <div class="dzb-kpi-sub">{{ $activeKeys }} with an active key</div>
        </div>
        <div class="dzb-kpi">
            <p class="dzb-kpi-label">Alerts</p>
            <div class="dzb-kpi-value">{{ $alerts->count() }}</div>
            <div class="dzb-kpi-sub {{ $failingAlerts > 0 ? 'dzb-crit' : '' }}">{{ $failingAlerts > 0 ? $failingAlerts . ' failing' : 'None failing' }}</div>
        </div>
    </div>

    <div class="box">
        <div class="box-header with-border dzb-head">
            <h3 class="box-title">Panel-wide bot</h3>
            @if ($sync !== null)
                <div class="dzb-tools"><span class="dzb-badge is-{{ $sync[0] }}">{{ $isGlobal ? 'Commands ' . strtolower($sync[1]) : 'Idle while customers bring their own' }}</span></div>
            @endif
        </div>

        <div class="box-body">
            @if ($global === null)
                <div class="dzb-cols">
                    <ol class="dzb-steps">
                        <li>Create an application at <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">discord.com/developers</a>. Its name and icon are what people will see.</li>
                        <li>Open <strong>Bot</strong>, press <strong>Reset Token</strong> and paste the token here. The application ID and public key are read from Discord for you.</li>
                        <li>Open <strong>OAuth2</strong>, copy the <strong>Client Secret</strong> into the second field, and add <code>{{ $redirect }}</code> as a redirect. This is how customers prove which Discord is theirs.</li>
                        <li>Back on <strong>General Information</strong>, paste the <strong>Interactions Endpoint URL</strong> this page shows next, and save.</li>
                        <li>Under <strong>Installation</strong>, tick <em>Guild Install</em>, and <em>User Install</em> if you want the commands in DMs too.</li>
                    </ol>

                    <form action="{{ route('admin.dezerx.discordbot.token') }}" method="POST">
                        {!! csrf_field() !!}
                        <div class="form-group" style="margin-bottom:14px">
                            <label class="control-label" for="dzb-token">Bot token</label>
                            <input type="password" id="dzb-token" name="token" class="form-control" autocomplete="new-password" placeholder="Paste the token from the Bot page" required />
                        </div>
                        <div class="form-group">
                            <label class="control-label" for="dzb-secret">Client secret</label>
                            <input type="password" id="dzb-secret" name="client_secret" class="form-control" autocomplete="new-password" placeholder="From OAuth2 → Client Secret" />
                        </div>
                        <p class="dzb-note">Stored encrypted and never sent to a browser. The token is checked with Discord before anything is saved.</p>
                        <button type="submit" class="btn btn-primary btn-sm" style="margin-top:12px">Connect bot</button>
                    </form>
                </div>
            @else
                <div class="dzb-identity">
                    <img src="{{ $global->avatarUrl() }}" alt="">
                    <div>
                        <strong>{{ $global->name }}</strong>
                        <span class="dzb-sub">Application {{ $global->application_id }} · {{ $global->commands_synced_at ? 'commands registered ' . $global->commands_synced_at->diffForHumans() : 'commands never registered' }}</span>
                    </div>
                    <div class="dzb-actions">
                        <a href="{{ $invite }}" target="_blank" rel="noreferrer" class="btn btn-primary btn-sm"><i class="fa fa-plus"></i> Add to a Discord server</a>
                        @if ($settings['user_install'])
                            <a href="{{ $userInstall }}" target="_blank" rel="noreferrer" class="btn btn-default btn-sm"><i class="fa fa-user-plus"></i> Add to my account</a>
                        @endif
                        <form action="{{ route('admin.dezerx.discordbot.sync') }}" method="POST">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-default btn-sm"><i class="fa fa-refresh"></i> Sync commands</button>
                        </form>
                        <form action="{{ route('admin.dezerx.discordbot.remove') }}" method="POST"
                              onsubmit="return confirm('Disconnect the panel-wide bot? Its alerts are deleted with it. Linked accounts stay linked.')">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-link btn-sm">Disconnect</button>
                        </form>
                    </div>
                </div>

                @if ($global->commands_error)
                    <div class="alert alert-danger" style="margin-bottom:18px">{{ $global->commands_error }}</div>
                @endif

                <div class="dzb-cols">
                    <div class="form-group">
                        <label class="control-label">Interactions Endpoint URL</label>
                        <div class="dzb-copy">
                            <input type="text" class="form-control" readonly value="{{ $endpoint }}" onclick="this.select()" />
                            <button type="button" class="btn btn-default" data-copy="{{ $endpoint }}">Copy</button>
                        </div>
                        <p class="dzb-note">
                            Paste into <a href="{{ $portal }}" target="_blank" rel="noreferrer">General Information</a>. Discord only saves it once the panel answers its test.
                            Behind Cloudflare, make sure Bot Fight Mode or a WAF rule does not challenge POSTs to this path.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">OAuth2 redirect</label>
                        <div class="dzb-copy">
                            <input type="text" class="form-control" readonly value="{{ $redirect }}" onclick="this.select()" />
                            <button type="button" class="btn btn-default" data-copy="{{ $redirect }}">Copy</button>
                        </div>
                        <p class="dzb-note">
                            Add under <a href="{{ $oauthPortal }}" target="_blank" rel="noreferrer">OAuth2 → Redirects</a>.
                            @if ($canOAuth)
                                <span class="dzb-badge is-good">Customers can link</span>
                            @else
                                <span class="dzb-badge is-crit">No client secret, nobody can link</span>
                            @endif
                        </p>
                    </div>

                    <form action="{{ route('admin.dezerx.discordbot.secret') }}" method="POST" class="form-group">
                        {!! csrf_field() !!}
                        <label class="control-label" for="dzb-secret">{{ $canOAuth ? 'Replace the client secret' : 'Client secret' }}</label>
                        <div class="dzb-copy">
                            <input type="password" id="dzb-secret" name="client_secret" class="form-control" autocomplete="new-password" placeholder="From OAuth2 → Client Secret" required />
                            <button type="submit" class="btn btn-default">Save</button>
                        </div>
                    </form>

                    <form action="{{ route('admin.dezerx.discordbot.token') }}" method="POST" class="form-group">
                        {!! csrf_field() !!}
                        <label class="control-label" for="dzb-token">Replace the bot token</label>
                        <div class="dzb-copy">
                            <input type="password" id="dzb-token" name="token" class="form-control" autocomplete="new-password" placeholder="A token is stored. Paste a new one to replace it" required />
                            <button type="submit" class="btn btn-default">Replace</button>
                        </div>
                        <p class="dzb-note">Stored encrypted and never sent to a browser. The token is checked with Discord before anything is saved.</p>
                    </form>
                </div>
            @endif
        </div>
    </div>

    <form action="{{ route('admin.dezerx.discordbot.update') }}" method="POST">
        {!! csrf_field() !!}
        <div class="box">
            <div class="box-header with-border dzb-head">
                <h3 class="box-title">Settings</h3>
            </div>

            <div class="box-body">
                <div class="dzb-cols">
                    <div class="dzb-stack">
                        <label class="dz-switch">
                            <input type="checkbox" name="enabled" value="1" {{ $enabled ? 'checked' : '' }} />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Turn the Discord bot on</strong>
                                <small>Adds a Discord page to everybody's account and a Discord tab to every server it covers. While this is off every command answers that the bot is switched off.</small>
                            </span>
                        </label>

                        <div>
                            <span class="dzb-label">Who runs the bot</span>
                            <div class="dzb-seg" role="radiogroup" aria-label="Who runs the bot">
                                <label class="{{ $isGlobal ? 'is-on' : '' }}">
                                    <input type="radio" name="mode" value="global" {{ $isGlobal ? 'checked' : '' }} />
                                    One bot for everybody
                                </label>
                                <label class="{{ $isGlobal ? '' : 'is-on' }}">
                                    <input type="radio" name="mode" value="personal" {{ $isGlobal ? '' : 'checked' }} />
                                    Everybody brings their own
                                </label>
                            </div>
                            <p class="dzb-note dzb-hint" data-hint="global" {{ $isGlobal ? '' : 'hidden' }}>
                                You connect a single Discord application above. Customers link their Discord with a Discord sign-in, so they only ever reach their own servers, and cannot bring a bot of their own.
                            </p>
                            <p class="dzb-note dzb-hint" data-hint="personal" {{ $isGlobal ? 'hidden' : '' }}>
                                Each customer pastes their own bot token, picks its commands and design, and chooses which of their Discord roles may use each command. Their bot always acts as them. The panel-wide bot stops answering.
                            </p>
                        </div>

                        <label class="dz-switch">
                            <input type="checkbox" name="user_install" value="1" {{ $settings['user_install'] ? 'checked' : '' }} />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Let people add the bot to their own Discord account</strong>
                                <small>Makes the commands work in DMs and in any server without the bot joining it. Needs <em>User Install</em> ticked under Installation in the Developer Portal. Alerts still need the bot inside the server they post in.</small>
                            </span>
                        </label>

                        <label class="dz-switch">
                            <input type="checkbox" name="billing" value="1" {{ $settings['billing'] ? 'checked' : '' }} />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>The <code>/billing</code> command <span class="dzb-badge {{ $billingConfigured ? 'is-good' : 'is-warn' }}">{{ $billingConfigured ? 'Billing connected' : 'Billing not set up' }}</span></strong>
                                <small>Plan, price, renewal date and unpaid invoices from the <a href="{{ route('admin.dezerx.billing') }}">billing module</a>. While billing is not set up the command stays hidden.</small>
                            </span>
                        </label>
                    </div>

                    <div class="dzb-stack">
                        <label class="dz-switch">
                            <input type="checkbox" name="alerts" value="1" {{ $settings['alerts'] ? 'checked' : '' }} />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Resource alerts</strong>
                                <small><code>/alerts add</code> watches a server and pings a role when its CPU, memory or disk crosses a percentage, or when it stops without anybody asking. Checked every minute by the scheduler, so <code>php artisan schedule:run</code> has to be running.</small>
                            </span>
                        </label>

                        <label class="dz-switch">
                            <input type="checkbox" name="console_images" value="1" {{ $settings['console_images'] ? 'checked' : '' }} />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Let bots draw the console as an image</strong>
                                <small>Bot owners can pick a drawn console instead of the text block. It looks better but costs CPU on every refresh. Turn it off and every bot sends the text console. The resource graph is always drawn.</small>
                            </span>
                        </label>

                        <div class="form-group">
                            <label class="control-label" for="dzb-slots">Full-quality replies at once</label>
                            <input type="number" id="dzb-slots" name="slots" min="1" max="{{ \Pterodactyl\Services\Dezerx\DiscordBot\BotConfig::MAX_SLOTS }}" required
                                   class="form-control" style="max-width:110px" value="{{ $settings['slots'] }}"
                                   data-workers="{{ $capacity['workers'] ?? '' }}" data-recommended="{{ $capacity['recommended'] ?? 3 }}" />
                            <p class="dzb-note">
                                How many Discord clicks may fetch live stats and draw the graph and console at the same moment. Each one keeps one of the panel's PHP workers busy for about a third of a second.
                                Clicks past this are still answered straight away, with loading animations that fill in on the next refresh. The default is 3.
                            </p>
                            <p class="dzb-note">
                                @if ($capacity)
                                    This server runs <strong>{{ $capacity['workers'] }}</strong> PHP workers (<code>pm.max_children</code>), so up to <strong>{{ $capacity['recommended'] }}</strong> is safe.
                                @else
                                    The panel couldn't read this server's PHP-FPM settings. A stock install has 5 PHP workers, so keep this at 2 or 3 unless you have raised <code>pm.max_children</code>.
                                @endif
                            </p>
                            <div id="dzb-slots-warn" class="alert small" style="display:none;margin:8px 0 0;padding:8px 12px"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="box">
            <div class="box-header with-border dzb-head">
                <h3 class="box-title">Commands on this panel</h3>
                <div class="dzb-tools">{{ $commandsOn }} of {{ count($catalogue) }} on</div>
            </div>

            <div class="box-body">
                <p class="dzb-note" style="margin:0 0 16px">
                    Untick a command to switch it off for every bot on the panel, customers' own bots included. It stops working straight away and drops out of
                    Discord's command menu once the bots re-sync, usually within a minute. <code>/help</code> always stays.
                </p>
                <input type="hidden" name="command_list" value="1" />
                <div class="dz-grid is-wide">
                    @foreach ($catalogue as $name => $meta)
                        @php
                            $locked = in_array($name, $alwaysOn, true);
                            $on = $locked || !in_array($name, $settings['disabled'], true);
                        @endphp
                        <label class="dz-check">
                            <input type="checkbox" name="commands_on[]" value="{{ $name }}" {{ $on ? 'checked' : '' }} {{ $locked ? 'disabled' : '' }} />
                            <span class="dz-check-box"></span>
                            <span class="dz-check-text">
                                <code>/{{ $name }}</code>
                                <small>{{ $meta['description'] }}</small>
                            </span>
                        </label>
                    @endforeach
                </div>
            </div>
        </div>

        <div class="box">
            <div class="box-header with-border dzb-head">
                <h3 class="box-title">Where it works</h3>
                <div class="dzb-tools">{{ $scope }}</div>
            </div>

            <div class="box-body">
                <p class="dzb-note" style="margin:0 0 16px">
                    Leave both lists empty and the bot reaches every server. Tick eggs, nodes or both and it only lists, controls and alerts on servers that
                    match every list you used. Servers outside it vanish from <code>/servers</code> and autocomplete, and lose their Discord tab.
                </p>

                <div class="dzb-cols">
                    <div>
                        <div class="dz-pick-head">
                            <span class="dzb-label">Eggs</span>
                            <a class="dz-all" data-scope="eggs">Select all</a>
                            <a class="dz-none" data-scope="eggs">Select none</a>
                        </div>
                        <div class="dz-picks" data-scope="eggs">
                            @foreach ($nestsWithEggs as $nest)
                                <p class="dz-nest">{{ $nest->name }}</p>
                                <div class="dz-grid">
                                    @foreach ($nest->eggs->sortBy('name') as $egg)
                                        <label class="dz-check">
                                            <input type="checkbox" name="eggs[]" value="{{ $egg->uuid }}" {{ in_array($egg->uuid, $settings['eggs'], true) ? 'checked' : '' }} />
                                            <span class="dz-check-box"></span>
                                            <span class="dz-check-text">{{ $egg->name }}</span>
                                        </label>
                                    @endforeach
                                </div>
                            @endforeach
                        </div>
                    </div>

                    <div>
                        <div class="dz-pick-head">
                            <span class="dzb-label">Nodes</span>
                            <a class="dz-all" data-scope="nodes">Select all</a>
                            <a class="dz-none" data-scope="nodes">Select none</a>
                        </div>
                        <div class="dz-picks" data-scope="nodes">
                            <div class="dz-grid">
                                @forelse ($nodes as $node)
                                    <label class="dz-check">
                                        <input type="checkbox" name="nodes[]" value="{{ $node->id }}" {{ in_array($node->id, $settings['nodes'], true) ? 'checked' : '' }} />
                                        <span class="dz-check-box"></span>
                                        <span class="dz-check-text">
                                            {{ $node->name }}
                                            <small>{{ $node->location?->short }} · {{ $node->servers_count }} {{ $node->servers_count === 1 ? 'server' : 'servers' }}</small>
                                        </span>
                                    </label>
                                @empty
                                    <p class="dzb-note" style="margin:0">There are no nodes yet.</p>
                                @endforelse
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="dzb-savebar">
            <span>Settings, commands and where it works are saved together.</span>
            <button type="submit" class="btn btn-primary btn-sm">Save changes</button>
        </div>
    </form>

    @if ($global !== null)
        <div class="box">
            <div class="box-header with-border dzb-head">
                <h3 class="box-title">Commands &amp; design</h3>
                <div class="dzb-tools">For the panel-wide bot. Customers' own bots have the same page in their account.</div>
            </div>
            <div class="box-body">
                <div class="dzb-design">
                    <form id="dzb-design-form" action="{{ route('admin.dezerx.discordbot.bot') }}" method="POST">
                        {!! csrf_field() !!}
                        <table class="table table-condensed dzb-cmd">
                            <tbody>
                                @foreach ($commands as $command)
                                    @php
                                        $frozen = $command['locked'] || !$command['available'];
                                    @endphp
                                    <tr class="{{ $command['available'] ? '' : 'text-muted' }}">
                                        <td style="width:32px">
                                            @if ($frozen)
                                                <input type="hidden" name="commands[{{ $command['name'] }}][enabled]" value="{{ $command['stored'] ? 1 : 0 }}" />
                                            @endif
                                            <label class="dz-check" style="margin:0">
                                                <input type="checkbox" name="commands[{{ $command['name'] }}][enabled]" value="1" {{ $command['enabled'] ? 'checked' : '' }} {{ $frozen ? 'disabled' : '' }} />
                                                <span class="dz-check-box"></span>
                                            </label>
                                        </td>
                                        <td style="white-space:nowrap"><i class="fa fa-{{ $commandIcons[$command['name']] ?? 'terminal' }} dzb-icon" aria-hidden="true"></i> <code>/{{ $command['name'] }}</code></td>
                                        <td>
                                            {{ $command['description'] }}
                                            @if ($command['locked'])
                                                <span class="dzb-badge is-idle">Always on</span>
                                            @elseif (!$command['available'])
                                                <span class="dzb-badge is-warn">{{ $command['name'] === 'billing' ? 'Needs billing' : 'Off panel-wide' }}</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>

                        <div class="dzb-fields">
                            <div class="form-group">
                                <label class="control-label">Accent colour</label>
                                <div class="dzb-copy">
                                    <input type="color" class="form-control" style="width:52px;padding:2px" value="{{ $design['accent'] ?: $themeAccent }}"
                                           oninput="this.nextElementSibling.value = this.value; this.nextElementSibling.dispatchEvent(new Event('input', { bubbles: true }))" />
                                    <input type="text" name="design[accent]" class="form-control" placeholder="{{ $themeAccent }}" value="{{ $design['accent'] }}" />
                                </div>
                                <p class="dzb-note">The stripe down every card. Empty follows the panel accent.</p>
                            </div>
                            <div class="form-group">
                                <label class="control-label">Resource bars</label>
                                <select name="design[bars]" class="form-control">
                                    @foreach ($bars as $bar)
                                        <option value="{{ $bar }}" {{ $design['bars'] === $bar ? 'selected' : '' }}>{{ $barLabels[$bar] ?? $bar }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="control-label">Footer text</label>
                                <input type="text" name="design[footer]" class="form-control" maxlength="80" placeholder="{{ config('app.name') }}" value="{{ $design['footer'] }}" />
                            </div>
                            <div class="form-group">
                                <label class="control-label">Console lines</label>
                                <input type="number" name="design[console_lines]" class="form-control" min="5" max="30" value="{{ $design['console_lines'] }}" />
                            </div>
                            <div class="form-group">
                                <label class="control-label">Bar length</label>
                                <input type="number" name="design[bar_length]" class="form-control" min="5" max="30" value="{{ $design['bar_length'] ?? 16 }}" />
                                <p class="dzb-note">Squares in each resource bar. Longer bars fill more of a wide screen but wrap sooner on a phone.</p>
                            </div>
                        </div>

                        <div class="dzb-switches">
                            <label class="dz-switch">
                                <input type="checkbox" name="design[banner]" value="1" {{ $design['banner'] ? 'checked' : '' }} />
                                <span class="dz-switch-track"></span>
                                <span class="dz-switch-text"><strong>Game banners</strong><small>On the control panel, and the branded banner on <code>/help</code>.</small></span>
                            </label>
                            <label class="dz-switch">
                                <input type="checkbox" name="design[logos]" value="1" {{ $design['logos'] ? 'checked' : '' }} />
                                <span class="dz-switch-track"></span>
                                <span class="dz-switch-text"><strong>Game logos</strong><small>The game's logo beside each server.</small></span>
                            </label>
                        </div>

                        <button type="submit" class="btn btn-primary btn-sm">Save commands &amp; design</button>
                    </form>

                    <div class="dzb-stage">
                        <div class="dzb-seg dzb-tabs" id="dzb-tabs" role="tablist" aria-label="Preview"></div>
                        <div class="dzb-stage-inner" id="dzb-stage"></div>
                        <p class="dzb-note" style="margin-top:8px">Sample data, drawn by the same code the bot uses. Discord renders emoji and fonts slightly differently on each device.</p>
                    </div>
                </div>
            </div>
        </div>
    @endif

    <div class="box">
        <div class="box-header with-border dzb-head">
            <h3 class="box-title">Linked accounts</h3>
            <div class="dzb-tools">{{ $members->count() }}</div>
        </div>
        <div class="box-body table-responsive no-padding">
            <table class="table table-hover">
                <thead>
                    <tr><th>Panel account</th><th>Discord</th><th>Bot key</th><th></th></tr>
                </thead>
                <tbody>
                    @forelse ($members as $member)
                        <tr>
                            <td>
                                @if ($member->user)
                                    <a href="{{ route('admin.users.view', $member->user->id) }}">{{ $member->user->username }}</a>
                                @else
                                    <span class="text-muted">Deleted</span>
                                @endif
                            </td>
                            <td>
                                <div class="dzb-who">
                                    <img src="{{ $member->avatarUrl() }}" alt="">
                                    <div>{{ $member->username }}<span class="dzb-sub">{{ $member->discord_id }}</span></div>
                                </div>
                            </td>
                            <td>
                                @if ($member->apiKey)
                                    <span class="dzb-badge is-good">Active</span>
                                    <span class="dzb-sub">{{ $member->apiKey->last_used_at ? 'Used ' . $member->apiKey->last_used_at->diffForHumans() : 'Never used' }}</span>
                                @else
                                    <span class="dzb-badge is-crit">Revoked</span>
                                @endif
                            </td>
                            <td class="text-right">
                                <form action="{{ route('admin.dezerx.discordbot.members.destroy', $member->id) }}" method="POST" onsubmit="return confirm('Unlink this account? Its bot API key and alerts are deleted.')">
                                    {!! csrf_field() !!}{!! method_field('DELETE') !!}
                                    <button type="submit" class="btn btn-xs btn-danger" title="Unlink"><i class="fa fa-unlink"></i></button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="dzb-empty">Nobody has linked a Discord account yet.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>

    @if ($personalBots->isNotEmpty() || !$isGlobal)
        <div class="box">
            <div class="box-header with-border dzb-head">
                <h3 class="box-title">Customers' own bots</h3>
                <div class="dzb-tools">{{ $personalBots->count() }}</div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr><th>Bot</th><th>Owner</th><th>Status</th><th></th></tr>
                    </thead>
                    <tbody>
                        @forelse ($personalBots as $bot)
                            <tr>
                                <td>
                                    <div class="dzb-who">
                                        <img class="is-square" src="{{ $bot->avatarUrl() }}" alt="">
                                        <div>{{ $bot->name }}<span class="dzb-sub">{{ $bot->application_id }}</span></div>
                                    </div>
                                </td>
                                <td>
                                    @if ($bot->owner)
                                        <a href="{{ route('admin.users.view', $bot->owner->id) }}">{{ $bot->owner->username }}</a>
                                    @endif
                                </td>
                                <td>
                                    @if ($bot->commands_error)
                                        <span class="dzb-badge is-crit" title="{{ $bot->commands_error }}">Commands failed</span>
                                    @elseif (!$bot->apiKey)
                                        <span class="dzb-badge is-crit">Key revoked</span>
                                    @else
                                        <span class="dzb-badge is-good">{{ count(\Pterodactyl\Services\Dezerx\DiscordBot\BotSettings::active($bot)) }} commands</span>
                                    @endif
                                </td>
                                <td class="text-right">
                                    <form action="{{ route('admin.dezerx.discordbot.bots.destroy', $bot->id) }}" method="POST" onsubmit="return confirm('Disconnect this customer\'s bot? Its key and alerts are deleted with it.')">
                                        {!! csrf_field() !!}{!! method_field('DELETE') !!}
                                        <button type="submit" class="btn btn-xs btn-danger" title="Disconnect"><i class="fa fa-times"></i></button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="4" class="dzb-empty">No customer has connected a bot yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    @endif

    <div class="box">
        <div class="box-header with-border dzb-head">
            <h3 class="box-title">Alerts</h3>
            <div class="dzb-tools">{{ $alerts->count() }}</div>
        </div>
        <div class="box-body table-responsive no-padding">
            <table class="table table-hover">
                <thead>
                    <tr><th>Server</th><th>Watching</th><th>Last fired</th><th></th></tr>
                </thead>
                <tbody>
                    @forelse ($alerts as $alert)
                        <tr>
                            <td>
                                @if ($alert->server)
                                    <a href="{{ route('admin.servers.view', $alert->server->id) }}">{{ $alert->server->name }}</a>
                                @endif
                                <span class="dzb-sub">By {{ $alert->user->username ?? '?' }} · <a href="https://discord.com/channels/{{ $alert->guild_id }}/{{ $alert->channel_id }}" target="_blank" rel="noreferrer">channel</a></span>
                            </td>
                            <td>
                                {{ \Pterodactyl\Services\Dezerx\DiscordBot\Views\Alerts::thresholds($alert, false) }}
                                @if ($alert->last_error)
                                    <span class="dzb-sub dzb-crit">{{ $alert->last_error }}</span>
                                @endif
                            </td>
                            <td>{{ $alert->notified_at ? $alert->notified_at->diffForHumans() : 'Never' }}</td>
                            <td class="text-right">
                                <form action="{{ route('admin.dezerx.discordbot.alerts.destroy', $alert->id) }}" method="POST" onsubmit="return confirm('Remove this alert?')">
                                    {!! csrf_field() !!}{!! method_field('DELETE') !!}
                                    <button type="submit" class="btn btn-xs btn-danger" title="Remove"><i class="fa fa-bell-slash"></i></button>
                                </form>
                            </td>
                        </tr>
                    @empty
                        <tr><td colspan="4" class="dzb-empty">No alerts yet. They are made in Discord with <code>/alerts add</code>.</td></tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </div>
</div>

<script>
    (function () {
        document.querySelectorAll('.dz-all, .dz-none').forEach(function (link) {
            link.addEventListener('click', function () {
                var on = link.classList.contains('dz-all');

                document.querySelectorAll('.dz-picks[data-scope="' + link.getAttribute('data-scope') + '"] input[type="checkbox"]').forEach(function (box) {
                    box.checked = on;
                });
            });
        });

        document.querySelectorAll('.dzb-seg input[name="mode"]').forEach(function (radio) {
            radio.addEventListener('change', function () {
                document.querySelectorAll('.dzb-seg input[name="mode"]').forEach(function (other) {
                    other.parentNode.classList.toggle('is-on', other.checked);
                });
                document.querySelectorAll('.dzb-hint').forEach(function (hint) {
                    hint.hidden = hint.getAttribute('data-hint') !== radio.value;
                });
            });
        });

        document.querySelectorAll('[data-copy]').forEach(function (button) {
            button.addEventListener('click', function () {
                navigator.clipboard.writeText(button.getAttribute('data-copy')).then(function () {
                    button.textContent = 'Copied';
                    window.setTimeout(function () { button.textContent = 'Copy'; }, 1500);
                });
            });
        });
    })();
</script>

@if ($global !== null)
<script>
    (function () {
        var previews = @json($previews);
        var form = document.getElementById('dzb-design-form');
        var tabs = document.getElementById('dzb-tabs');
        var stage = document.getElementById('dzb-stage');
        var chosen = previews.length ? previews[0].key : null;
        var timer = null;

        function draw() {
            tabs.innerHTML = '';
            tabs.hidden = previews.length === 0;

            previews.forEach(function (preview) {
                var tab = document.createElement('button');
                tab.type = 'button';
                tab.setAttribute('role', 'tab');
                tab.setAttribute('aria-selected', preview.key === chosen ? 'true' : 'false');
                tab.className = preview.key === chosen ? 'is-on' : '';
                tab.textContent = preview.title;
                tab.addEventListener('click', function () { chosen = preview.key; draw(); });
                tabs.appendChild(tab);
            });

            var current = previews.filter(function (preview) { return preview.key === chosen; })[0] || previews[0];

            if (current) {
                chosen = current.key;
                stage.innerHTML = current.html;
            } else {
                stage.innerHTML = '<div class="dzp-msg dzp-empty">Every command is switched off.</div>';
            }
        }

        function refresh() {
            stage.classList.add('dzb-loading');

            fetch(@json(route('admin.dezerx.discordbot.preview')), {
                method: 'POST',
                headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: new FormData(form),
                credentials: 'same-origin',
            })
                .then(function (response) { return response.json(); })
                .then(function (body) { previews = body.previews || []; draw(); })
                .catch(function () {})
                .finally(function () { stage.classList.remove('dzb-loading'); });
        }

        function schedule() {
            window.clearTimeout(timer);
            timer = window.setTimeout(refresh, 300);
        }

        form.addEventListener('input', schedule);
        form.addEventListener('change', schedule);
        draw();
    })();
</script>
@endif
<script>
    (function () {
        var input = document.getElementById('dzb-slots');
        var box = document.getElementById('dzb-slots-warn');

        if (!input || !box) {
            return;
        }

        var workers = parseInt(input.getAttribute('data-workers'), 10);
        var recommended = parseInt(input.getAttribute('data-recommended'), 10) || 3;

        function check() {
            var value = parseInt(input.value, 10);

            if (!value || value <= recommended) {
                box.style.display = 'none';

                return;
            }

            var danger = workers ? value >= workers - 1 : value > 6;

            box.className = 'alert small ' + (danger ? 'alert-danger' : 'alert-warning');
            box.textContent = danger
                ? (workers
                    ? 'That leaves the panel ' + Math.max(0, workers - value) + ' of its ' + workers + ' PHP workers. A burst of Discord clicks could stop the panel answering for everyone. Keep it at ' + recommended + ' or lower.'
                    : 'That is a lot for a server whose PHP worker count is unknown. A burst of Discord clicks could stop the panel answering for everyone.')
                : 'Higher than recommended (' + recommended + '). Under heavy Discord use the panel can get slow for everyone, so only raise this if the server has CPU and PHP workers to spare.';
            box.style.display = '';
        }

        input.addEventListener('input', check);
        check();
    })();
</script>
@endsection
