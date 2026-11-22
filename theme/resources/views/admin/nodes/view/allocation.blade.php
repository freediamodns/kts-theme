@extends('layouts.admin')

@php
    $sorted = $folders !== null;
    $mine = $sorted ? collect($folders)->where('custom', true) : collect();
    $byIp = $sorted ? collect($folders)->where('custom', false) : collect();
    $hasMine = ! $mine->isEmpty();
    $hasIp = ! $byIp->isEmpty();
    $manyFolders = $sorted && count($folders) > 8;
    $named = $folderName !== null;
    $inFolder = $sorted && $folder !== 'all';
    $onFolder = $inFolder && $named;
    $isIpFolder = str_starts_with($folder, 'ip:');
    $folderIcon = $folderMeta['icon'] ?? 'fa-folder-o';
    $folderColor = $folderMeta['color'] ?? '';
    $folderImage = $named ? ($folderMeta['image'] ?? '') : '';
    $folderHeld = $sorted ? (int) (collect($folders)->firstWhere('key', $folder)['count'] ?? 0) : 0;
    $folderNote = $folderMeta['note'] ?? '';
    $totalHeld = $sorted ? collect($folders)->sum('count') : 0;
    $totalFree = $sorted ? collect($folders)->sum('free') : 0;
@endphp

@section('title')
    {{ $node->name }}: Allocations
@endsection

@section('content-header')
    <h1>{{ $node->name }}<small>Control allocations available for servers on this node.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.nodes') }}">Nodes</a></li>
        <li><a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a></li>
        <li class="active">Allocations</li>
    </ol>
@endsection

@section('scripts')
    @parent
    <style>
        :root {
            --af-card: var(--sa-box, #3f4d5a);
            --af-deep: var(--sa-page, #33404d);
            --af-ink: var(--sa-well, #1f2933);
            --af-sub: var(--sa-well-hover, #394754);
            --af-line: var(--sa-line, #4d5b69);
            --af-edge: var(--sa-field-edge, #606d7b);
            --af-text: var(--sa-ink, #cad1d8);
            --af-dim: var(--sa-muted, #9aa5b1);
            --af-accent: var(--sa-accent, #099aa5);
        }

        .dz-check {
            position: relative;
            display: inline-block;
            width: 18px;
            height: 18px;
            margin: 0;
            vertical-align: middle;
            cursor: pointer;
        }

        .dz-check > input[type="checkbox"] {
            position: absolute;
            width: 0;
            height: 0;
            opacity: 0;
            margin: 0;
        }

        .dz-check > span {
            position: absolute;
            top: 0;
            left: 0;
            width: 18px;
            height: 18px;
            border: 1px solid var(--af-edge);
            border-radius: 3px;
            background: var(--af-deep);
            transition: background .12s, border-color .12s;
        }

        .dz-check > span::after {
            content: "\f00c";
            font-family: FontAwesome;
            font-size: 11px;
            line-height: 16px;
            display: block;
            text-align: center;
            color: var(--sa-on-accent, #fff);
            opacity: 0;
            transform: scale(.7);
            transition: opacity .12s, transform .12s;
        }

        .dz-check:hover > input:not(:disabled) + span { border-color: var(--af-accent); }
        .dz-check > input:checked + span { background: var(--af-accent); border-color: var(--af-accent); }
        .dz-check > input:checked + span::after { opacity: 1; transform: scale(1); }
        .dz-check > input:focus + span { box-shadow: 0 0 0 2px var(--sa-ring, rgba(9, 154, 165, .35)); }

        .dz-check > input:disabled + span {
            background: var(--af-ink);
            border-color: var(--sa-line, #43505d);
            cursor: not-allowed;
        }

        .dz-check > input:disabled + span::after { color: var(--af-dim); opacity: .45; transform: scale(1); }

        .dz-folders { margin: 0; background: var(--af-card); }
        .dz-folders > li { border-bottom: 0 !important; }

        .dz-folders > li > a {
            position: relative;
            padding: 8px 54px 8px 10px;
            background: var(--af-card);
            color: var(--af-text);
            border-radius: 0;
            border-left: 3px solid transparent;
            line-height: 1.3;
        }

        .dz-folders > li > a:hover,
        .dz-folders > li > a:focus {
            background: var(--af-deep);
            color: var(--sa-strong, #fff);
        }

        .dz-folders > li.active > a,
        .dz-folders > li.active > a:hover,
        .dz-folders > li.active > a:focus {
            background: var(--af-deep);
            color: var(--sa-strong, #fff);
            border-left-color: var(--af-accent);
            font-weight: 600;
        }

        .dz-folders > li > a > .fa { width: 16px; margin-right: 6px; text-align: center; color: var(--af-dim); }
        .dz-folder-art { width: 18px; height: 18px; margin-right: 4px; border-radius: 4px; object-fit: cover; vertical-align: -4px; background: var(--af-deep); }
        .dz-head-art { width: 20px; height: 20px; border-radius: 4px; object-fit: cover; vertical-align: -4px; }

        .dz-artpick { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }

        .dz-art {
            width: 38px;
            height: 38px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--af-edge);
            border-radius: 5px;
            background: var(--af-deep);
            color: var(--af-dim);
            cursor: pointer;
            overflow: hidden;
        }

        .dz-art > img { width: 100%; height: 100%; object-fit: cover; }
        .dz-art:hover { border-color: var(--af-accent); }
        .dz-art.active { border-color: var(--af-accent); box-shadow: 0 0 0 2px var(--sa-ring, rgba(9, 154, 165, .4)); }
        .dz-folders > li.active > a > .fa { color: inherit; }
        .dz-name { display: inline-block; max-width: 62%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
        .dz-sub-line { display: block; margin-left: 22px; margin-top: 2px; font-size: 11px; color: var(--af-dim); }
        .dz-folders .badge { float: right; background: var(--af-deep); color: var(--af-text); font-weight: 600; box-shadow: inset 0 0 0 1px var(--af-line); }
        .dz-folders > li.active .badge { background: var(--af-accent); color: var(--sa-on-accent, #fff); box-shadow: none; }
        .dz-note { display: block; margin-left: 22px; margin-top: 3px; font-size: 11px; color: var(--sa-muted, #8fa0b3); font-style: italic; }

        .dz-head {
            padding: 6px 12px;
            background: var(--af-ink);
            border-bottom: 1px solid var(--sa-line, #16202a);
            font-size: 11px;
            letter-spacing: .06em;
            text-transform: uppercase;
            color: var(--af-dim);
        }

        .dz-order { position: absolute; top: 7px; right: 6px; opacity: 0; transition: opacity .12s; }
        .dz-folders > li:hover .dz-order { opacity: 1; }
        .dz-order > span { padding: 0 3px; color: var(--af-dim); cursor: pointer; }
        .dz-order > span:hover { color: var(--sa-strong, #fff); }
        .dz-order > span.dz-drop:hover { color: var(--sa-danger, #ff8a7a); }

        .dz-search { padding: 8px; background: var(--af-ink); border-bottom: 1px solid var(--sa-line, #16202a); }

        .dz-folder-head { font-weight: normal; color: var(--af-dim); }

        .dz-chip {
            display: inline-block;
            padding: 1px 7px;
            border-radius: 10px;
            background: var(--af-deep);
            color: var(--af-text);
            font-size: 11px;
            font-weight: 600;
            box-shadow: inset 0 0 0 1px var(--af-line);
        }

        .dz-chip-free { background: var(--sa-good-bg, rgba(24, 154, 28, .22)); color: var(--sa-success, #7fd68a); box-shadow: inset 0 0 0 1px var(--sa-good-edge, rgba(24, 154, 28, .45)); }
        .dz-chip-more { cursor: pointer; }
        .dz-chip-more:hover { background: var(--af-accent); color: var(--sa-on-accent, #fff); }

        .dz-server { display: flex; align-items: center; gap: 7px; }
        .dz-egg-art { width: 26px; height: 26px; flex: 0 0 26px; border-radius: 5px; object-fit: cover; background: var(--af-deep); box-shadow: inset 0 0 0 1px var(--af-line); }
        .dz-server-name { min-width: 0; }
        .dz-server-name > a { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dz-egg-name { display: block; font-size: 11px; color: var(--af-dim); }

        .dz-toggle { display: inline-block; width: 16px; color: var(--af-dim); }
        .dz-toggle:hover { color: var(--sa-strong, #fff); }
        .dz-toggle .fa { transition: transform .12s; }
        .dz-toggle.open .fa { transform: rotate(90deg); }
        tr.dz-sub > td { background: var(--af-sub); }
        tr.dz-sub td[data-identifier="ip"] { padding-left: 26px; color: var(--af-dim); }
        .dz-branch { display: inline-block; width: 16px; color: var(--af-edge); }

        .dz-filter { padding: 10px 12px; background: var(--af-ink); border-bottom: 1px solid var(--sa-line, #16202a); }
        .dz-filter .form-group { margin: 0 8px 0 0; }
        .dz-filter label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--af-dim); display: block; margin-bottom: 2px; }
        .dz-filter .form-control { height: 30px; padding: 3px 8px; }
        .dz-port { width: 78px; }

        .dz-count-line {
            padding: 6px 12px;
            font-size: 12px;
            color: var(--af-dim);
            background: var(--af-card);
            border-bottom: 1px solid var(--af-ink);
        }

        .dz-count-line strong { color: var(--af-text); }

        .dz-picker { display: flex; flex-wrap: wrap; gap: 4px; }

        .dz-pick {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 30px;
            margin: 0;
            border: 1px solid var(--af-edge);
            border-radius: 3px;
            background: var(--af-deep);
            color: var(--af-text);
            cursor: pointer;
            font-weight: normal;
        }

        .dz-pick:hover { border-color: var(--af-accent); color: var(--sa-strong, #fff); }
        .dz-pick.active { border-color: var(--af-accent); background: var(--af-accent); color: var(--sa-on-accent, #fff); }
        .dz-pick input { display: none; }

        .dz-swatch { width: 26px; height: 26px; margin: 0; border-radius: 50%; border: 2px solid var(--af-card); box-shadow: 0 0 0 1px var(--af-edge); cursor: pointer; }
        .dz-swatch.active { box-shadow: 0 0 0 2px var(--sa-strong, #fff); }
        .dz-swatch-none { background: repeating-linear-gradient(45deg, #46545f, #46545f 4px, #38444f 4px, #38444f 8px); }
        .dz-swatch input { display: none; }

        .dz-tool-row { display: flex; gap: 6px; padding: 8px; background: var(--af-ink); border-bottom: 1px solid var(--sa-line, #16202a); }
        .dz-tool-row .btn { flex: 1; }

        .dz-scan { margin-bottom: 0; }
        .dz-scan td, .dz-scan th { vertical-align: middle !important; border-color: var(--af-line) !important; }
        .dz-sample { color: var(--af-dim); font-size: 11px; }

        .dz-about { padding: 2px 0 10px; }
        .dz-about-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .dz-disc { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 19px; color: #fff; }
        .dz-about-head h4 { margin: 0; font-weight: 600; color: var(--af-text); }
        .dz-about-head small { display: block; color: var(--af-dim); }

        .dz-callout {
            border-left: 3px solid var(--af-accent);
            background: var(--af-deep);
            border-radius: 0 3px 3px 0;
            padding: 8px 10px;
            font-size: 12px;
            color: var(--af-text);
            margin-bottom: 8px;
        }

        .dz-defaults { font-size: 12px; color: var(--af-dim); }
        .dz-defaults code { margin-right: 3px; }

        .dz-section { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--af-dim); margin: 12px 0 6px; }

        .dz-extra { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border: 1px solid var(--af-line); border-radius: 4px; background: var(--af-deep); margin-bottom: 5px; }
        .dz-extra-body { flex: 1; min-width: 0; }
        .dz-extra-title { color: var(--af-text); font-weight: 600; font-size: 13px; cursor: pointer; }
        .dz-extra .form-control { width: 86px; height: 28px; padding: 2px 6px; text-align: center; }
        .dz-plan-note { font-size: 11px; color: var(--af-dim); margin-top: 2px; }

        .dz-plan-block { position: relative; border: 1px solid var(--af-line); border-left: 3px solid var(--af-accent); border-radius: 4px; padding: 8px 10px; margin-bottom: 6px; background: var(--af-deep); }
        .dz-plan-block h5 { margin: 0 0 3px; font-weight: 600; color: var(--af-text); }
        .dz-plan-range { font-family: Menlo, Monaco, Consolas, monospace; font-size: 15px; color: var(--sa-accent, #7fd8e0); letter-spacing: .02em; }

        .dz-total { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 4px; background: var(--af-ink); color: var(--af-text); font-size: 13px; }
        .dz-total strong { color: var(--sa-strong, #fff); font-size: 16px; }

        .dz-pill { display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; background: var(--af-card); color: var(--af-text); box-shadow: inset 0 0 0 1px var(--af-line); }
        .dz-pill-new { background: var(--sa-good-bg, rgba(24, 154, 28, .22)); color: var(--sa-success, #7fd68a); box-shadow: inset 0 0 0 1px var(--sa-good-edge, rgba(24, 154, 28, .45)); }
        .dz-pill-old { background: var(--sa-warn-bg, rgba(250, 150, 54, .18)); color: var(--sa-warning, #f0b070); box-shadow: inset 0 0 0 1px var(--sa-warn-edge, rgba(250, 150, 54, .4)); }
        .dz-hr { border: 0; border-top: 1px solid var(--af-line); margin: 12px 0; }

        .dz-flag { border: 1px solid var(--af-line); border-left: 3px solid var(--af-edge); border-radius: 4px; background: var(--af-deep); padding: 8px 10px; margin-bottom: 8px; }
        .dz-flag-warn { border-left-color: var(--sa-warning, #fa9636); }
        .dz-flag-head { font-weight: 600; color: var(--af-text); }
        .dz-flag-warn .dz-flag-head { color: var(--sa-warning, #f0b070); }
        .dz-flag-body { font-size: 12px; color: var(--af-dim); margin-top: 2px; }
        .dz-flag-list { margin: 6px 0 0; padding-left: 18px; font-size: 12px; color: var(--af-text); }
        .dz-flag-list > li { margin-bottom: 2px; }
        .dz-warn { margin-top: 4px; font-size: 12px; color: var(--sa-warning, #f0b070); }

        .dz-array { border: 1px solid var(--af-line); border-radius: 4px; background: var(--af-deep); padding: 8px 10px; }
        .dz-array-tabs { display: flex; gap: 4px; margin-bottom: 6px; }

        .dz-array-tab {
            padding: 2px 10px;
            border-radius: 11px;
            font-size: 11px;
            font-weight: 600;
            color: var(--af-dim);
            background: var(--af-card);
            box-shadow: inset 0 0 0 1px var(--af-line);
            cursor: pointer;
        }

        .dz-array-tab:hover { color: var(--sa-strong, #fff); }
        .dz-array-tab.active { background: var(--af-accent); color: var(--sa-on-accent, #fff); box-shadow: none; }
        .dz-array-row { display: flex; gap: 5px; }
        .dz-array-row .form-control { font-family: Menlo, Monaco, Consolas, monospace; font-size: 12px; height: 32px; padding: 4px 8px; }
        .dz-array-row .btn { height: 32px; padding: 4px 10px; }
    </style>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li><a href="{{ route('admin.nodes.view', $node->id) }}">About</a></li>
                <li><a href="{{ route('admin.nodes.view.settings', $node->id) }}">Settings</a></li>
                <li><a href="{{ route('admin.nodes.view.configuration', $node->id) }}">Configuration</a></li>
                <li class="active"><a href="{{ route('admin.nodes.view.allocation', $node->id) }}">Allocation</a></li>
                <li><a href="{{ route('admin.nodes.view.servers', $node->id) }}">Servers</a></li>
            </ul>
        </div>
    </div>
</div>
<div class="row">
    <div class="col-sm-8">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">
                    Existing Allocations
                    @if ($inFolder)
                        <span class="dz-folder-head">
                            @if ($folderImage !== '')
                                <img class="dz-head-art" src="{{ $folderImage }}" alt="" loading="lazy">
                            @elseif ($named)
                                <i class="fa {{ $folderIcon }}"
                                   @if ($folderColor !== '') style="color: {{ $folderColor }}" @endif></i>
                            @endif
                            {{ $folderName ?? 'this folder no longer exists' }}
                        </span>
                    @endif
                </h3>

                <div class="box-tools pull-right">
                    @if ($onFolder)
                        <button type="button" class="btn btn-xs btn-default" data-toggle="modal"
                                data-target="#editFolderModal"><i class="fa fa-pencil"></i> Edit folder</button>

                        <button type="button" @class(['btn', 'btn-xs', 'btn-danger' => ! $isIpFolder, 'btn-default' => $isIpFolder])
                                data-action="delete-folder">{{ $isIpFolder ? 'Reset folder' : 'Delete folder' }}</button>
                    @endif

                    <button type="button" @class(['btn', 'btn-xs', 'btn-default', 'active' => $filtered])
                            data-action="toggle-filter">
                        <i class="fa fa-filter"></i> Filter @if ($filtered) <span class="dz-chip">on</span> @endif
                    </button>
                </div>
            </div>

            @if ($inFolder && $folderNote !== '')
                <div class="dz-count-line"><i class="fa fa-sticky-note-o"></i> {{ $folderNote }}</div>
            @endif

            <form method="GET" action="{{ route('admin.nodes.view.allocation', $node->id) }}" class="dz-filter form-inline"
                  @if (! $filtered) style="display: none;" @endif>
                @if ($sorted)
                    <input type="hidden" name="folder" value="{{ $folder }}">
                @endif

                <div class="form-group">
                    <label>Port from</label>
                    <input type="number" class="form-control dz-port" name="port_from" min="1" max="65535"
                           value="{{ $filters['port_from'] }}" placeholder="any">
                </div>
                <div class="form-group">
                    <label>to</label>
                    <input type="number" class="form-control dz-port" name="port_to" min="1" max="65535"
                           value="{{ $filters['port_to'] }}" placeholder="any">
                </div>
                <div class="form-group">
                    <label>Search</label>
                    <input type="text" class="form-control" name="q" value="{{ $filters['q'] }}"
                           placeholder="IP, alias, server or port" style="width: 190px;">
                </div>
                <div class="form-group">
                    <label>State</label>
                    <select class="form-control" name="state">
                        <option value="">Everything</option>
                        <option value="free" @if ($filters['state'] === 'free') selected @endif>Free only</option>
                        <option value="used" @if ($filters['state'] === 'used') selected @endif>In use only</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>&nbsp;</label>
                    <div>
                        <button type="submit" class="btn btn-sm btn-primary"><i class="fa fa-filter"></i> Filter</button>

                        @if ($filtered)
                            <a href="{{ route('admin.nodes.view.allocation', ['node' => $node->id, 'folder' => $folder]) }}"
                               class="btn btn-sm btn-default">Reset</a>
                            <button type="button" class="btn btn-sm btn-danger" data-action="purge"
                                    title="Delete every free allocation this filter matches">
                                <i class="fa fa-trash-o"></i> Delete matching
                            </button>
                        @endif
                    </div>
                </div>
            </form>

            <div class="dz-count-line">
                Showing <strong>{{ number_format($matched) }}</strong>
                allocation{{ $matched === 1 ? '' : 's' }}@if ($filtered) matching the filter @endif @if ($onFolder) in <strong>{{ $folderName }}</strong> @endif .
                <span class="pull-right">{{ number_format($freeOnNode) }} free on this node.</span>
            </div>

            <div class="box-body table-responsive no-padding" style="overflow-x: visible">
                <table class="table table-hover" style="margin-bottom:0;">
                    <tr>
                        <th>
                            <label class="dz-check hidden-xs">
                                <input type="checkbox" class="select-all-files" data-action="selectAll"><span></span>
                            </label>
                        </th>
                        <th>IP Address <i class="fa fa-fw fa-minus-square" style="font-weight:normal;color:#d9534f;cursor:pointer;" data-toggle="modal" data-target="#allocationModal"></i></th>
                        <th>IP Alias</th>
                        <th>Port</th>
                        <th>Assigned To</th>
                        <th>
                            <div class="btn-group hidden-xs">
                                <button type="button" id="mass_actions" class="btn btn-sm btn-default dropdown-toggle disabled"
                                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Mass Actions <span class="caret"></span>
                                </button>
                                <ul class="dropdown-menu dropdown-massactions">
                                    @if ($sorted)
                                        <li><a href="#" data-action="file-selected">Move to folder <i class="fa fa-fw fa-folder-open-o"></i></a></li>
                                        <li class="divider"></li>
                                    @endif
                                    <li><a href="#" id="selective-deletion" data-action="selective-deletion">Delete <i class="fa fa-fw fa-trash-o"></i></a></li>
                                </ul>
                            </div>
                        </th>
                    </tr>

                    @forelse ($groups as $index => $group)
                        @php($rows = $group['rows'])
                        @php($shown = count($rows))
                        @php($many = $group['server'] !== null && isset($rows[1]))

                        @foreach ($rows as $position => $allocation)
                            <tr data-allocation="{{ $allocation->id }}"
                                @class(['dz-sub' => $many && $position > 0])
                                @if ($many && $position > 0) data-group="g{{ $index }}" style="display: none;" @endif>
                                <td class="middle min-size" data-identifier="type">
                                    <label class="dz-check hidden-xs"
                                           title="{{ $allocation->server_id === null ? 'Select this allocation' : 'In use by a server' }}">
                                        <input type="checkbox" class="select-file" data-action="addSelection"
                                               @if ($allocation->server_id !== null) disabled="disabled" @endif><span></span>
                                    </label>
                                </td>
                                <td class="col-sm-3 middle" data-identifier="ip">
                                    @if ($many && $position === 0)
                                        <a href="#" class="dz-toggle" data-group="g{{ $index }}"><i class="fa fa-caret-right"></i></a>
                                    @elseif ($many)
                                        <span class="dz-branch"><i class="fa fa-level-up fa-rotate-90"></i></span>
                                    @endif
                                    {{ $allocation->ip }}
                                </td>
                                <td class="col-sm-3 middle">
                                    <input class="form-control input-sm" type="text" value="{{ $allocation->ip_alias }}" data-action="set-alias" data-id="{{ $allocation->id }}" placeholder="none" />
                                    <span class="input-loader"><i class="fa fa-refresh fa-spin fa-fw"></i></span>
                                </td>
                                <td class="col-sm-2 middle" data-identifier="port">
                                    {{ $allocation->port }}

                                    @if ($many && $position === 0)
                                        <span class="dz-chip dz-chip-more" data-action="open-group"
                                              data-group="g{{ $index }}">+{{ $shown - 1 }} more</span>
                                    @endif
                                </td>
                                <td class="col-sm-3 middle">
                                    @if ($allocation->server !== null)
                                        @if ($many && $position > 0)
                                            <span class="text-muted">same server</span>
                                        @else
                                            @php($egg = $allocation->server->egg)

                                            <span class="dz-server">
                                                <img class="dz-egg-art" alt="" loading="lazy"
                                                     src="{{ \Pterodactyl\Services\Dezerx\Allocations\EggArtwork::logo($egg?->uuid, $egg?->name) }}">

                                                <span class="dz-server-name">
                                                    <a href="{{ route('admin.servers.view', $allocation->server_id) }}">{{ $allocation->server->name }}</a>
                                                    <small class="dz-egg-name">
                                                        {{ $egg?->name ?? 'unknown egg' }}@if ($many && $group['total'] > $shown) · {{ $shown }} of {{ $group['total'] }} here @endif
                                                    </small>
                                                </span>
                                            </span>
                                        @endif
                                    @else
                                        <span class="dz-chip dz-chip-free">free</span>
                                    @endif
                                </td>
                                <td class="col-sm-1 middle">
                                    @if ($sorted)
                                        <button data-action="file-one" data-id="{{ $allocation->id }}"
                                                class="btn btn-sm btn-default" title="Move to folder"><i class="fa fa-folder-open-o"></i></button>
                                    @endif

                                    @if ($allocation->server_id === null)
                                        <button data-action="deallocate" data-id="{{ $allocation->id }}" class="btn btn-sm btn-danger"><i class="fa fa-trash-o"></i></button>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    @empty
                        <tr>
                            <td colspan="6" class="text-center text-muted" style="padding: 22px;">
                                @if ($filtered)
                                    Nothing on this node matches that filter.
                                @else
                                    There are no allocations here yet.
                                @endif
                            </td>
                        </tr>
                    @endforelse
                </table>
            </div>
            @if($node->allocations->hasPages())
                <div class="box-footer text-center">
                    {{ $node->allocations->render() }}
                </div>
            @endif
        </div>
    </div>
    <div class="col-sm-4">
        @if ($sorted)
            <div class="box box-default">
                <div class="box-header with-border">
                    <h3 class="box-title">Folders</h3>

                    <div class="box-tools pull-right">
                        <button type="button" class="btn btn-xs btn-default" data-toggle="modal"
                                data-target="#newFolderModal"><i class="fa fa-plus"></i> New</button>
                    </div>
                </div>

                <div class="dz-tool-row">
                    <button type="button" class="btn btn-sm btn-primary" data-action="auto-sort">
                        <i class="fa fa-magic"></i> Auto-sort
                    </button>
                    <button type="button" class="btn btn-sm btn-success" data-action="wizard">
                        <i class="fa fa-list-ol"></i> Port planner
                    </button>
                </div>

                <div class="box-body no-padding">
                    @if ($manyFolders)
                        <div class="dz-search">
                            <input type="text" class="form-control input-sm" id="folderSearch"
                                   placeholder="Find a folder…" autocomplete="off">
                        </div>
                    @endif

                    <ul class="nav nav-pills nav-stacked dz-folders">
                        @if ($hasMine)
                            <li class="dz-head">Your folders</li>

                            @foreach ($mine as $entry)
                                <li @class(['active' => $folder === $entry['key']]) data-name="{{ mb_strtolower($entry['name']) }}">
                                    <a href="{{ route('admin.nodes.view.allocation', ['node' => $node->id, 'folder' => $entry['key']]) }}">
                                        <span class="dz-order">
                                            <span data-action="shift" data-folder="{{ $entry['key'] }}" data-direction="up" title="Move up"><i class="fa fa-angle-up"></i></span>
                                            <span data-action="shift" data-folder="{{ $entry['key'] }}" data-direction="down" title="Move down"><i class="fa fa-angle-down"></i></span>
                                            <span class="dz-drop" data-action="drop-folder" data-folder="{{ $entry['key'] }}"
                                                  data-name="{{ $entry['name'] }}" data-count="{{ $entry['count'] }}"
                                                  title="Delete folder"><i class="fa fa-times"></i></span>
                                        </span>

                                        @if ($entry['image'] !== '')
                                            <img class="dz-folder-art" src="{{ $entry['image'] }}" alt="" loading="lazy">
                                        @else
                                            <i class="fa {{ $entry['icon'] }}" aria-hidden="true"
                                               @if ($entry['color'] !== '') style="color: {{ $entry['color'] }}" @endif></i>
                                        @endif
                                        <span class="dz-name">{{ $entry['name'] }}</span>
                                        <span class="badge">{{ number_format($entry['count']) }}</span>

                                        <span class="dz-sub-line">
                                            {{ number_format($entry['free']) }} free
                                            @if ($entry['profile'] !== '') · sorted automatically @endif
                                        </span>

                                        @if ($entry['note'] !== '')
                                            <span class="dz-note">{{ \Illuminate\Support\Str::limit($entry['note'], 70) }}</span>
                                        @endif
                                    </a>
                                </li>
                            @endforeach
                        @endif

                        @if ($hasIp)
                            <li class="dz-head">By IP</li>

                            @foreach ($byIp as $entry)
                                <li @class(['active' => $folder === $entry['key']]) data-name="{{ mb_strtolower($entry['name'] . ' ' . $entry['hint']) }}">
                                    <a href="{{ route('admin.nodes.view.allocation', ['node' => $node->id, 'folder' => $entry['key']]) }}">
                                        @if ($entry['dressed'])
                                            <span class="dz-order">
                                                <span class="dz-drop" data-action="drop-folder" data-folder="{{ $entry['key'] }}"
                                                      data-name="{{ $entry['name'] }}" data-count="{{ $entry['count'] }}" data-ip="1"
                                                      title="Reset this folder"><i class="fa fa-undo"></i></span>
                                            </span>
                                        @endif

                                        @if ($entry['image'] !== '')
                                            <img class="dz-folder-art" src="{{ $entry['image'] }}" alt="" loading="lazy">
                                        @else
                                            <i class="fa {{ $entry['icon'] }}" aria-hidden="true"
                                               @if ($entry['color'] !== '') style="color: {{ $entry['color'] }}" @endif></i>
                                        @endif
                                        <span class="dz-name">{{ $entry['name'] }}</span>
                                        <span class="badge">{{ number_format($entry['count']) }}</span>

                                        <span class="dz-sub-line">
                                            {{ number_format($entry['free']) }} free
                                            @if ($entry['hint'] !== '' && $entry['hint'] !== $entry['name']) · {{ $entry['hint'] }} @endif
                                        </span>

                                        @if ($entry['note'] !== '')
                                            <span class="dz-note">{{ \Illuminate\Support\Str::limit($entry['note'], 70) }}</span>
                                        @endif
                                    </a>
                                </li>
                            @endforeach
                        @endif

                        <li @class(['dz-all', 'active' => $folder === 'all']) data-name="all allocations">
                            <a href="{{ route('admin.nodes.view.allocation', ['node' => $node->id, 'folder' => 'all']) }}">
                                <i class="fa fa-list" aria-hidden="true"></i>
                                <span class="dz-name">All allocations</span>
                                <span class="badge">{{ number_format($totalHeld) }}</span>
                                <span class="dz-sub-line">{{ number_format($totalFree) }} free · everything on the node</span>
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        @endif

        <form action="{{ route('admin.nodes.view.allocation', $node->id) }}" method="POST">
            <div class="box box-success">
                <div class="box-header with-border">
                    <h3 class="box-title">Assign New Allocations</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="pAllocationIP" class="control-label">IP Address</label>
                        <div>
                            <select class="form-control" name="allocation_ip" id="pAllocationIP" multiple>
                                @foreach($allocations as $allocation)
                                    <option value="{{ $allocation->ip }}">{{ $allocation->ip }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted small">Enter an IP address to assign ports to here.</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pAllocationIP" class="control-label">IP Alias</label>
                        <div>
                            <input type="text" id="pAllocationAlias" class="form-control" name="allocation_alias" placeholder="alias" />
                            <p class="text-muted small">If you would like to assign a default alias to these allocations enter it here.</p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="pAllocationPorts" class="control-label">Ports</label>
                        <div>
                            <select class="form-control" name="allocation_ports[]" id="pAllocationPorts" multiple></select>
                            <p class="text-muted small">Enter individual ports or port ranges here separated by commas or spaces.</p>
                        </div>
                    </div>

                    @if ($sorted)
                        <div class="form-group no-margin">
                            <label for="pAllocationFolder" class="control-label">Put them in</label>
                            <div>
                                <select class="form-control" name="allocation_folder" id="pAllocationFolder">
                                    <option value="all">Their IP's own folder</option>

                                    @foreach ($mine as $entry)
                                        <option value="{{ $entry['key'] }}"
                                                @if ($folder === $entry['key']) selected @endif>{{ $entry['name'] }}</option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                    @endif
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-success btn-sm pull-right">Submit</button>
                </div>
            </div>
        </form>
    </div>
</div>
<div class="modal fade" id="allocationModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title">Delete Allocations for IP Block</h4>
            </div>
            <form action="{{ route('admin.nodes.view.allocation.removeBlock', $node->id) }}" method="POST">
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-12">
                            <select class="form-control" name="ip">
                                @foreach($allocations as $allocation)
                                    <option value="{{ $allocation->ip }}"
                                            @if ($isIpFolder && $folder === 'ip:' . $allocation->ip) selected @endif>{{ $allocation->ip }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    {{{ csrf_field() }}}
                    <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
                    <button type="submit" class="btn btn-danger">Delete Allocations</button>
                </div>
            </form>
        </div>
    </div>
</div>

<form id="purgeForm" action="{{ route('admin.dezerx.allocationtools.purge', $node->id) }}" method="POST" style="display: none;">
    {!! csrf_field() !!}
    <input type="hidden" name="port_from" value="">
    <input type="hidden" name="port_to" value="">
    <input type="hidden" name="folder" value="{{ $folder }}">
    <input type="hidden" name="current" value="{{ $folder }}">
</form>

@if ($sorted)
    <form id="shiftFolderForm" action="{{ route('admin.dezerx.allocationfolders.shift', $node->id) }}"
          method="POST" style="display: none;">
        {!! csrf_field() !!}
        <input type="hidden" name="folder" value="">
        <input type="hidden" name="direction" value="">
        <input type="hidden" name="current" value="{{ $folder }}">
    </form>

    <form id="deleteFolderForm" action="{{ route('admin.dezerx.allocationfolders.destroy', $node->id) }}"
          method="POST" style="display: none;">
        {!! csrf_field() !!}
        {!! method_field('DELETE') !!}
        <input type="hidden" name="folder" value="">
        <input type="hidden" name="current" value="{{ $folder }}">
    </form>

    <div class="modal fade" id="newFolderModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">New folder</h4>
                </div>

                <form action="{{ route('admin.dezerx.allocationfolders.store', $node->id) }}" method="POST">
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="control-label">Name</label>
                            <input type="text" class="form-control" name="name" maxlength="48" autocomplete="off"
                                   placeholder="Proxies, Bedrock, Reserved…" required>
                        </div>

                        @include('admin.nodes.view.partials.folder-look', ['look' => []])

                        <p class="text-muted small" style="margin-top: 10px; margin-bottom: 0;">
                            An empty folder to file allocations into. It holds nothing until you move something in,
                            and deleting it later puts everything back under its IP.
                        </p>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <input type="hidden" name="current" value="{{ $folder }}">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create folder</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    @if ($onFolder)
        <div class="modal fade" id="editFolderModal" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title">Edit folder</h4>
                    </div>

                    <form action="{{ route('admin.dezerx.allocationfolders.rename', $node->id) }}" method="POST">
                        <div class="modal-body">
                            <div class="form-group">
                                <label class="control-label">Name</label>
                                <input type="text" class="form-control" name="name" maxlength="48" autocomplete="off"
                                       value="{{ $folderName }}">

                                @if ($isIpFolder)
                                    <p class="text-muted small" style="margin-top: 6px; margin-bottom: 0;">
                                        This is an IP's own folder. Naming it changes nothing but what this page calls it,
                                        and clearing the box puts the IP back.
                                    </p>
                                @endif
                            </div>

                            @include('admin.nodes.view.partials.folder-look', ['look' => $folderMeta])
                        </div>

                        <div class="modal-footer">
                            {!! csrf_field() !!}
                            <input type="hidden" name="folder" value="{{ $folder }}">
                            <input type="hidden" name="current" value="{{ $folder }}">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save folder</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

    @endif

    <div class="modal fade" id="moveFolderModal" tabindex="-1" role="dialog">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Move to folder</h4>
                </div>

                <form action="{{ route('admin.dezerx.allocationfolders.move', $node->id) }}" method="POST">
                    <div class="modal-body">
                        <p>Moving <strong><span id="moveFolderCount">0</span></strong> allocation(s).</p>

                        <select class="form-control" name="folder" id="moveFolderPick">
                            <option value="__new" @if (! $hasMine) selected @endif>New folder...</option>

                            @foreach ($mine as $entry)
                                <option value="{{ $entry['key'] }}">{{ $entry['name'] }}</option>
                            @endforeach

                            <option value="all">Take out of every folder</option>
                        </select>

                        <div id="moveFolderNew" style="margin-top: 8px;">
                            <input type="text" class="form-control" name="name" maxlength="48" autocomplete="off"
                                   placeholder="Name the new folder">
                        </div>

                        <p class="text-muted small" style="margin-top: 8px; margin-bottom: 0;">
                            Nothing happens to the allocations themselves. This only decides which folder
                            this page lists them under. Taking them out puts them back under their IP.
                        </p>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <input type="hidden" name="current" value="{{ $folder }}">
                        <div id="moveFolderIds"></div>
                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary">Move</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="autoSortModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title"><i class="fa fa-magic"></i> Auto-sort this node</h4>
                </div>

                <form action="{{ route('admin.dezerx.allocationtools.sort', $node->id) }}" method="POST">
                    <div class="modal-body">
                        <p class="text-muted small">
                            Every allocation attached to a server is read from the egg that server was built from, which
                            is as good as certain. A txAdmin port on a number nobody would guess still lands in the
                            FiveM folder beside the game port it belongs to. The spare ones are worked out from the port
                            number itself, leaning on what this node already runs. Anything it cannot place is left
                            exactly where it is.
                        </p>

                        <div id="autoSortBody">
                            <p class="text-center text-muted" style="padding: 20px;">
                                <i class="fa fa-spinner fa-spin"></i> Reading the node…
                            </p>
                        </div>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <input type="hidden" name="current" value="{{ $folder }}">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-primary" id="autoSortGo" disabled>Sort them</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <div class="modal fade" id="wizardModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title"><i class="fa fa-list-ol"></i> Port planner</h4>
                </div>

                <form action="{{ route('admin.dezerx.allocationtools.create', $node->id) }}" method="POST" id="wizardForm">
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-sm-5">
                                <div class="form-group">
                                    <label class="control-label">Game or service</label>
                                    <select class="form-control" name="profile" id="wizardProfile">
                                        <option value="">Pick one…</option>
                                        @foreach ($catalogue as $category => $profiles)
                                            <optgroup label="{{ $category }}">
                                                @foreach ($profiles as $profile)
                                                    <option value="{{ $profile['key'] }}">{{ $profile['name'] }}</option>
                                                @endforeach
                                            </optgroup>
                                        @endforeach
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="control-label">IP address</label>
                                    <select class="form-control" name="ip" id="wizardIp">
                                        @foreach($allocations as $allocation)
                                            <option value="{{ $allocation->ip }}">{{ $allocation->ip }}</option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted small no-margin">The IPs already on this node.</p>
                                </div>

                                <div class="row">
                                    <div class="col-xs-6">
                                        <div class="form-group">
                                            <label class="control-label">Servers</label>
                                            <input type="number" class="form-control" name="servers" id="wizardServers"
                                                   value="10" min="1" max="2000">
                                        </div>
                                    </div>
                                    <div class="col-xs-6">
                                        <div class="form-group">
                                            <label class="control-label">First port</label>
                                            <input type="number" class="form-control" name="start" id="wizardStart"
                                                   value="" min="1025" max="65535">
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="control-label">Alias <small class="text-muted">optional</small></label>
                                    <input type="text" class="form-control" name="alias" maxlength="191"
                                           placeholder="none">
                                </div>

                                <div class="form-group no-margin">
                                    <label class="control-label">Folder</label>
                                    <select class="form-control" name="folder" id="wizardFolder">
                                        <option value="">The game's own folder (made if needed)</option>
                                        @foreach ($mine as $entry)
                                            <option value="{{ $entry['key'] }}">{{ $entry['name'] }}</option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>

                            <div class="col-sm-7">
                                <span class="dz-array-tab" id="wizardDetailsToggle" style="display: none;">
                                    <i class="fa fa-sliders"></i> Game options
                                </span>

                                <div id="wizardDetails">
                                <div id="wizardAbout" class="text-muted dz-about">
                                    Pick a game and this will tell you the ports it wants, the extra ones its egg needs
                                    on top (txAdmin, RCON, a query port) and lay the whole block out for however many
                                    servers you are selling, skipping anything already on the IP.
                                </div>

                                <div id="wizardExtras"></div>
                                </div>

                                <div id="wizardPreview"></div>
                            </div>
                        </div>
                    </div>

                    <div class="modal-footer">
                        {!! csrf_field() !!}
                        <input type="hidden" name="current" value="{{ $folder }}">
                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-default" id="wizardPreviewGo">Preview</button>
                        <button type="submit" class="btn btn-success" id="wizardCreate" disabled>Create allocations</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
@endif
@endsection

@section('footer-scripts')
    @parent
    <script>
    $('[data-action="addSelection"]').on('click', function () {
        updateMassActions();
    });

    $('[data-action="selectAll"]').on('click', function () {
        $('input.select-file').not(':disabled').prop('checked', function (i, val) {
            return !val;
        });

        updateMassActions();
    });

    $('[data-action="selective-deletion"]').on('mousedown', function () {
        deleteSelected();
    });

    $('#pAllocationIP').select2({
        tags: true,
        maximumSelectionLength: 1,
        selectOnClose: true,
        tokenSeparators: [',', ' '],
    });

    $('#pAllocationPorts').select2({
        tags: true,
        selectOnClose: true,
        tokenSeparators: [',', ' '],
    });

    $('button[data-action="deallocate"]').click(function (event) {
        event.preventDefault();
        var element = $(this);
        var allocation = $(this).data('id');
        swal({
            title: '',
            text: 'Are you sure you want to delete this allocation?',
            type: 'warning',
            showCancelButton: true,
            allowOutsideClick: true,
            closeOnConfirm: false,
            confirmButtonText: 'Delete',
            confirmButtonColor: '#d9534f',
            showLoaderOnConfirm: true
        }, function () {
            $.ajax({
                method: 'DELETE',
                url: '/admin/nodes/view/' + {{ $node->id }} + '/allocation/remove/' + allocation,
                headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
            }).done(function (data) {
                element.parent().parent().addClass('warning').delay(100).fadeOut();
                swal({ type: 'success', title: 'Port Deleted!' });
            }).fail(function (jqXHR) {
                console.error(jqXHR);
                swal({
                    title: 'Whoops!',
                    text: jqXHR.responseJSON.error,
                    type: 'error'
                });
            });
        });
    });

    var typingTimer;
    $('input[data-action="set-alias"]').keyup(function () {
        clearTimeout(typingTimer);
        $(this).parent().removeClass('has-error has-success');
        typingTimer = setTimeout(sendAlias, 250, $(this));
    });

    var fadeTimers = [];
    function sendAlias(element) {
        element.parent().find('.input-loader').show();
        clearTimeout(fadeTimers[element.data('id')]);
        $.ajax({
            method: 'POST',
            url: '/admin/nodes/view/' + {{ $node->id }} + '/allocation/alias',
            headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
            data: {
                alias: element.val(),
                allocation_id: element.data('id'),
            }
        }).done(function () {
            element.parent().addClass('has-success');
        }).fail(function (jqXHR) {
            console.error(jqXHR);
            element.parent().addClass('has-error');
        }).always(function () {
            element.parent().find('.input-loader').hide();
            fadeTimers[element.data('id')] = setTimeout(clearHighlight, 2500, element);
        });
    }

    function clearHighlight(element) {
        element.parent().removeClass('has-error has-success');
    }

    function updateMassActions() {
        if ($('input.select-file:checked').length > 0) {
            $('#mass_actions').removeClass('disabled');
        } else {
            $('#mass_actions').addClass('disabled');
        }
    }

    function deleteSelected() {
        var selectedIds = [];
        var selectedItems = [];
        var selectedItemsElements = [];

        $('input.select-file:checked').each(function () {
            var $parent = $($(this).closest('tr'));
            var id = $parent.find('[data-action="deallocate"]').data('id');
            var $ip = $parent.find('td[data-identifier="ip"]');
            var $port = $parent.find('td[data-identifier="port"]');
            var block = `${$ip.text().trim()}:${$port.text().trim()}`;

            selectedIds.push({
                id: id
            });
            selectedItems.push(block);
            selectedItemsElements.push($parent);
        });

        if (selectedItems.length !== 0) {
            var formattedItems = "";
            var i = 0;
            $.each(selectedItems, function (key, value) {
                formattedItems += ("<code>" + value + "</code>, ");
                i++;
                return i < 5;
            });

            formattedItems = formattedItems.slice(0, -2);
            if (selectedItems.length > 5) {
                formattedItems += ', and ' + (selectedItems.length - 5) + ' other(s)';
            }

            swal({
                type: 'warning',
                title: '',
                text: 'Are you sure you want to delete the following allocations: ' + formattedItems + '?',
                html: true,
                showCancelButton: true,
                showConfirmButton: true,
                closeOnConfirm: false,
                showLoaderOnConfirm: true
            }, function () {
                $.ajax({
                    method: 'DELETE',
                    url: '/admin/nodes/view/' + {{ $node->id }} + '/allocations',
                    headers: {'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content')},
                    data: JSON.stringify({
                        allocations: selectedIds
                    }),
                    contentType: 'application/json',
                    processData: false
                }).done(function () {
                    $('#file_listing input:checked').each(function () {
                        $(this).prop('checked', false);
                    });

                    $.each(selectedItemsElements, function () {
                        $(this).addClass('warning').delay(200).fadeOut();
                    });

                    swal({
                        type: 'success',
                        title: 'Allocations Deleted'
                    });
                }).fail(function (jqXHR) {
                    console.error(jqXHR);
                    swal({
                        type: 'error',
                        title: 'Whoops!',
                        html: true,
                        text: 'An error occurred while attempting to delete these allocations. Please try again.',
                    });
                });
            });
        } else {
            swal({
                type: 'warning',
                title: '',
                text: 'Please select allocation(s) to delete.',
            });
        }
    }

    $('[data-action="toggle-filter"]').on('click', function () {
        $('.dz-filter').slideToggle(120);
        $(this).toggleClass('active');
    });

    $('[data-action="open-group"], .dz-toggle').on('click', function (event) {
        event.preventDefault();

        var group = $(this).data('group');
        var $rows = $('tr[data-group="' + group + '"]');

        $rows.toggle();
        $('.dz-toggle[data-group="' + group + '"]').toggleClass('open', $rows.first().is(':visible'));
    });

    $('[data-action="purge"]').on('click', function (event) {
        event.preventDefault();

        var $form = $('.dz-filter');
        var from = $form.find('input[name="port_from"]').val();
        var to = $form.find('input[name="port_to"]').val();

        if (!from && !to) {
            swal({ type: 'warning', title: '', text: 'Set a port range first. This deletes by range, not by search.' });

            return;
        }

        from = from || 1;
        to = to || 65535;

        swal({
            type: 'warning',
            title: '',
            text: 'Delete every free allocation between ' + from + ' and ' + to + '{{ $inFolder ? ' in this folder' : '' }}? Allocations a server is using are left alone.',
            showCancelButton: true,
            closeOnConfirm: false,
            confirmButtonText: 'Delete them',
            confirmButtonColor: '#d9534f',
            showLoaderOnConfirm: true
        }, function () {
            $('#purgeForm input[name="port_from"]').val(from);
            $('#purgeForm input[name="port_to"]').val(to);
            $('#purgeForm').submit();
        });
    });

    @if ($sorted)
    $('[data-action="file-one"]').on('click', function (event) {
        event.preventDefault();
        openFolderMove([$(this).data('id')]);
    });

    $('[data-action="file-selected"]').on('click', function (event) {
        event.preventDefault();

        var ids = [];

        $('input.select-file:checked').each(function () {
            var id = $(this).closest('tr').data('allocation');

            if (id) {
                ids.push(id);
            }
        });

        openFolderMove(ids);
    });

    $('[data-action="delete-folder"]').on('click', function (event) {
        event.preventDefault();
        dropFolder('{{ $folder }}', @json($folderName ?? ''), {{ $folderHeld }}, {{ $isIpFolder ? 'true' : 'false' }});
    });

    $('[data-action="drop-folder"]').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        dropFolder($(this).data('folder'), $(this).data('name'), Number($(this).data('count')), $(this).data('ip') === 1);
    });

    function dropFolder(folder, name, held, isIp) {
        var what = isIp
            ? 'This folder is an IP, so it cannot be deleted while allocations sit on it. Resetting drops the name, ' +
              'icon, colour, picture and note you gave it and lists it under its own address again. No allocation is touched.'
            : (held > 0
                ? 'It holds <strong>' + held.toLocaleString() + '</strong> allocation' + (held === 1 ? '' : 's') +
                  '. None of them are deleted. They are released back into their IP\'s folder.'
                : 'It is empty.');

        swal({
            type: 'warning',
            title: '',
            text: (isIp ? 'Reset <strong>' : 'Delete <strong>') + escapeHtml(name || 'this folder') + '</strong>? ' + what,
            html: true,
            showCancelButton: true,
            closeOnConfirm: false,
            confirmButtonText: isIp ? 'Reset folder' : 'Delete folder',
            confirmButtonColor: isIp ? '#099aa5' : '#d9534f',
            showLoaderOnConfirm: true
        }, function () {
            $('#deleteFolderForm input[name="folder"]').val(folder);
            $('#deleteFolderForm').submit();
        });
    }

    $('[data-action="shift"]').on('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        $('#shiftFolderForm input[name="folder"]').val($(this).data('folder'));
        $('#shiftFolderForm input[name="direction"]').val($(this).data('direction'));
        $('#shiftFolderForm').submit();
    });

    $('#folderSearch').on('keyup', function () {
        var needle = $(this).val().toLowerCase();

        $('.dz-folders > li[data-name]').each(function () {
            $(this).toggle(String($(this).data('name')).indexOf(needle) !== -1);
        });

        $('.dz-head').toggle(needle === '');
    });

    $('.dz-picker').on('click', '.dz-pick, .dz-swatch', function () {
        var $group = $(this).closest('.dz-picker');

        $group.find('.dz-pick, .dz-swatch').removeClass('active');
        $(this).addClass('active');
    });

    $('.dz-artpick').on('click', '.dz-art', function () {
        var $group = $(this).closest('.form-group');

        $group.find('.dz-art').removeClass('active');
        $(this).addClass('active');
        $group.find('.dz-art-url').val($(this).data('image'));
    });

    $('.dz-art-url').on('keyup change', function () {
        var value = $(this).val();

        $(this).closest('.form-group').find('.dz-art').each(function () {
            $(this).toggleClass('active', String($(this).data('image')) === value);
        });
    });

    $('#moveFolderPick').on('change', function () {
        $('#moveFolderNew').toggle($(this).val() === '__new');
        $('#moveFolderNew input').prop('required', $(this).val() === '__new');
    }).trigger('change');

    function openFolderMove(ids) {
        if (!ids.length) {
            swal({ type: 'warning', title: '', text: 'Please select allocation(s) to move.' });

            return;
        }

        var box = $('#moveFolderIds').empty();

        $.each(ids, function (index, id) {
            box.append($('<input>', { type: 'hidden', name: 'allocations[]', value: id }));
        });

        $('#moveFolderCount').text(ids.length);
        $('#moveFolderModal').modal('show');
        $('#moveFolderPick').trigger('change');
    }

    $('[data-action="auto-sort"]').on('click', function () {
        $('#autoSortModal').modal('show');
        $('#autoSortGo').prop('disabled', true);
        $('#autoSortBody').html('<p class="text-center text-muted" style="padding: 20px;"><i class="fa fa-spinner fa-spin"></i> Reading the node…</p>');

        $.ajax({
            method: 'POST',
            url: '{{ route('admin.dezerx.allocationtools.scan', $node->id) }}',
            headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
        }).done(function (data) {
            $('#autoSortBody').html(renderScan(data));
            $('#autoSortGo').prop('disabled', data.moving === 0);
            updateSortButton();
        }).fail(function (jqXHR) {
            console.error(jqXHR);
            $('#autoSortBody').html('<p class="text-danger text-center" style="padding: 20px;">The node could not be read. Try again.</p>');
        });
    });

    function renderScan(data) {
        if (!data.groups.length) {
            return renderReview(data.review) +
                '<p class="text-center text-muted" style="padding: 20px;">Nothing on this node looks like a game the catalogue knows.' +
                ' Ports that cannot be placed are left exactly where they are.</p>';
        }

        var html = renderReview(data.review) +
            '<p class="small text-muted">Read ' + Number(data.scanned).toLocaleString() + ' allocation(s). ' +
            '<strong>' + Number(data.moving).toLocaleString() + '</strong> would move.</p>' +
            '<table class="table table-hover dz-scan" style="margin-bottom: 0;"><tr>' +
            '<th style="width: 30px;"></th><th>Folder</th><th style="width: 90px;">Moving</th><th>Ports it found</th></tr>';

        $.each(data.groups, function (index, group) {
            var checked = group.moving > 0 ? ' checked' : '';
            var disabled = group.moving > 0 ? '' : ' disabled';

            html += '<tr><td><label class="dz-check"><input type="checkbox" class="dz-sort-pick" name="groups[]" value="' +
                escapeHtml(group.key) + '"' + checked + disabled + '><span></span></label></td>' +
                '<td><span class="dz-disc" style="width: 26px; height: 26px; flex: 0 0 26px; font-size: 13px; display: inline-flex; vertical-align: middle; background: ' +
                escapeHtml(group.color) + '"><i class="fa ' + escapeHtml(group.icon) + '"></i></span> ' +
                '<strong>' + escapeHtml(group.name) + '</strong>' +
                (group.filed ? ' <span class="dz-pill">folder exists</span>' : '') +
                '<br><span class="dz-sample">' + escapeHtml(group.blurb) + '</span></td>' +
                '<td>' + (group.moving > 0
                    ? '<span class="dz-pill dz-pill-new">' + Number(group.moving).toLocaleString() + '</span>'
                    : '<span class="text-muted">already filed</span>') +
                '</td>' +
                '<td class="dz-sample">' + group.sample.join(', ') +
                (group.count > group.sample.length ? ' … (' + Number(group.count).toLocaleString() + ' total)' : '') +
                '</td></tr>';
        });

        return html + '</table>';
    }

    function renderReview(review) {
        if (!review) {
            return '';
        }

        var html = '';

        if (review.mismatched && review.mismatched.length) {
            html += '<div class="dz-flag dz-flag-warn"><div class="dz-flag-head">' +
                '<i class="fa fa-exclamation-triangle"></i> ' + review.mismatched.length +
                ' server(s) are on another game\'s port</div>' +
                '<div class="dz-flag-body">These will be filed by their egg, which is almost certainly right, but the port ' +
                'belongs to something else, so it is worth a look before a customer finds it.</div><ul class="dz-flag-list">';

            $.each(review.mismatched, function (index, row) {
                html += '<li><strong>' + escapeHtml(row.name || ('server #' + row.server)) + '</strong> ' +
                    '<span class="dz-sample">(' + escapeHtml(row.egg) + ' → ' + escapeHtml(row.expected) + ')</span>' +
                    ' holds <code>' + row.ports.join('</code> <code>') + '</code>, which is <strong>' +
                    escapeHtml(row.found) + '</strong>.</li>';
            });

            html += '</ul></div>';
        }

        if (review.eggs && review.eggs.length) {
            html += '<div class="dz-flag"><div class="dz-flag-head">' +
                '<i class="fa fa-question-circle"></i> ' + review.eggs.length +
                ' egg(s) the catalogue does not know</div>' +
                '<div class="dz-flag-body">Servers on these are sorted by their port numbers alone, which is a guess. ' +
                'Rename the egg to include the game, or file them by hand.</div><ul class="dz-flag-list">';

            $.each(review.eggs, function (index, row) {
                html += '<li><strong>' + escapeHtml(row.egg) + '</strong> <span class="dz-sample">' +
                    row.servers + ' server(s)</span></li>';
            });

            html += '</ul></div>';
        }

        if (review.unplaced && review.unplaced.count) {
            html += '<div class="dz-flag"><div class="dz-flag-head">' +
                '<i class="fa fa-inbox"></i> ' + Number(review.unplaced.count).toLocaleString() +
                ' free allocation(s) could not be placed</div>' +
                '<div class="dz-flag-body">Nothing about these ports says which game they are for, so they stay in their ' +
                'IP\'s folder. For example <code>' + review.unplaced.sample.join('</code> <code>') + '</code>.</div></div>';
        }

        return html;
    }

    $('#autoSortBody').on('change', '.dz-sort-pick', updateSortButton);

    function updateSortButton() {
        $('#autoSortGo').prop('disabled', $('.dz-sort-pick:checked').length === 0);
    }

    var catalogue = {};

    @foreach ($catalogue as $profiles)
        @foreach ($profiles as $profile)
            catalogue[{{ \Illuminate\Support\Js::from($profile['key']) }}] = {{ \Illuminate\Support\Js::from($profile) }};
        @endforeach
    @endforeach

    $('[data-action="wizard"]').on('click', function () {
        $('#wizardModal').modal('show');
    });

    $('#wizardProfile').on('change', function () {
        var profile = catalogue[$(this).val()];

        $('#wizardPreview').empty();
        $('#wizardDetails').show();
        $('#wizardDetailsToggle').hide();
        $('#wizardCreate').prop('disabled', true);

        if (!profile) {
            $('#wizardAbout').html('Pick a game and this will tell you the ports it wants.');
            $('#wizardExtras').empty();

            return;
        }

        $('#wizardStart').val(profile.start);

        $('#wizardAbout').html(
            '<div class="dz-about-head">' +
                '<span class="dz-disc" style="background: ' + escapeHtml(profile.color) + '">' +
                    '<i class="fa ' + escapeHtml(profile.icon) + '"></i></span>' +
                '<div><h4>' + escapeHtml(profile.name) + '</h4>' +
                '<small>' + escapeHtml(profile.blurb) + '</small></div>' +
            '</div>' +
            '<div class="dz-callout"><strong>Recommended:</strong> ' + escapeHtml(profile.notes) + '</div>' +
            '<div class="dz-defaults">Default port' + (profile.ports.length === 1 ? '' : 's') + ': <code>' +
            (profile.ports.length ? profile.ports.join('</code> <code>') : String(profile.start)) + '</code>' +
            ' · <strong>' + (profile.per > 1 ? profile.per + ' ports' : 'one port') + '</strong> per server' +
            '</div>'
        );

        var extras = '';

        if (profile.extras.length) {
            extras = '<div class="dz-section">Extra ports this egg wants</div>';

            $.each(profile.extras, function (index, extra) {
                extras += '<div class="dz-extra">' +
                    '<label class="dz-check"><input type="checkbox" class="dz-extra-on" data-key="' +
                    escapeHtml(extra.key) + '"' + (extra.default ? ' checked' : '') + '><span></span></label>' +
                    '<div class="dz-extra-body">' +
                        '<span class="dz-extra-title">' + escapeHtml(extra.name) + '</span>' +
                        (extra.default ? ' <span class="dz-pill dz-pill-new">needed</span>' : '') +
                        '<div class="dz-plan-note">' + escapeHtml(extra.note) + '</div>' +
                    '</div>' +
                    '<input type="number" class="form-control dz-extra-port" name="extras[' +
                    escapeHtml(extra.key) + ']" value="' + extra.start + '" min="1025" max="65535"' +
                    (extra.default ? '' : ' disabled') + '>' +
                    '</div>';
            });
        }

        $('#wizardExtras').html(extras);
    });

    $('#wizardDetailsToggle').on('click', function () {
        $('#wizardDetails').toggle();
    });

    $('#wizardExtras').on('click', '.dz-extra-title', function () {
        $(this).closest('.dz-extra').find('.dz-extra-on').prop('checked', function (i, on) {
            return !on;
        }).trigger('change');
    });

    $('#wizardExtras').on('change', '.dz-extra-on', function () {
        $(this).closest('.dz-extra').find('.dz-extra-port').prop('disabled', !$(this).is(':checked'));
        $('#wizardCreate').prop('disabled', true);
    });

    $('#wizardProfile, #wizardIp, #wizardServers, #wizardStart').on('change keyup', function () {
        $('#wizardCreate').prop('disabled', true);
    });

    $('#wizardPreviewGo').on('click', function () {
        if (!$('#wizardProfile').val()) {
            $('#wizardPreview').html('<p class="text-danger small">Pick a game first.</p>');

            return;
        }

        portArray = null;
        $('#wizardPreview').html('<p class="text-muted small"><i class="fa fa-spinner fa-spin"></i> Working it out…</p>');

        $.ajax({
            method: 'POST',
            url: '{{ route('admin.dezerx.allocationtools.plan', $node->id) }}',
            headers: { 'X-CSRF-TOKEN': $('meta[name="_token"]').attr('content') },
            data: $('#wizardForm').serialize(),
        }).done(function (plan) {
            $('#wizardPreview').html(renderPlan(plan));
            $('#portArrayValue').val(portArray ? portArray.plain : '');
            $('#wizardCreate').prop('disabled', plan.fresh === 0 || plan.over);

            $('#wizardDetails').hide();
            $('#wizardDetailsToggle').show();
        }).fail(function (jqXHR) {
            console.error(jqXHR);
            $('#wizardPreview').html('<p class="text-danger small">That did not add up. Check the numbers and try again.</p>');
        });
    });

    function renderPlan(plan) {
        if (plan.error) {
            return '<p class="text-danger small">' + escapeHtml(plan.error) + '</p>';
        }

        var html = '<hr class="dz-hr"><div class="dz-section">What this creates on ' +
            escapeHtml(plan.ip) + '</div>';

        $.each(plan.blocks, function (index, block) {
            html += '<div class="dz-plan-block" style="border-left-color: ' + escapeHtml(plan.color) + '">' +
                '<h5>' + escapeHtml(block.label) + '</h5>' +
                '<div class="dz-plan-range">' + block.start + (block.end !== block.start ? ' – ' + block.end : '') + '</div>' +
                (block.clash ? '<div class="dz-warn"><i class="fa fa-exclamation-triangle"></i> These ports overlap another block above.</div>' : '') +
                '<div class="dz-plan-note">' + escapeHtml(block.note) + '</div></div>';
        });

        if (plan.over) {
            html += '<div class="dz-total" style="color: #ff9b8a;"><i class="fa fa-exclamation-triangle"></i> That is ' +
                Number(plan.fresh).toLocaleString() + ' new ports, over the ' + Number(plan.limit).toLocaleString() +
                ' a single run will create. Do it in a couple of passes.</div>';
        } else if (plan.fresh === 0) {
            html += '<div class="dz-total"><i class="fa fa-check-circle"></i> Every port in that plan is already on this IP, so there is nothing to create.</div>';
        } else {
            html += '<div class="dz-total"><i class="fa fa-magic"></i> <span><strong>' +
                Number(plan.fresh).toLocaleString() + '</strong> allocations will be created and filed into the folder.' +
                (plan.existing ? ' ' + Number(plan.existing).toLocaleString() + ' were already there and are left alone.' : '') +
                '</span></div>';
        }

        if (plan.array && plan.array.plain) {
            html += '<div class="dz-section">Port array <small class="text-muted">one server, for your billing panel</small></div>' +
                '<div class="dz-array">' +
                    '<div class="dz-array-tabs">' +
                        '<span class="dz-array-tab active" data-array="plain">Ports only</span>' +
                        '<span class="dz-array-tab" data-array="bound">Bound to ' + escapeHtml(plan.ip) + '</span>' +
                    '</div>' +
                    '<div class="dz-array-row">' +
                        '<input type="text" class="form-control" id="portArrayValue" readonly>' +
                        '<button type="button" class="btn btn-default" id="copyPortArray" title="Copy">' +
                            '<i class="fa fa-clipboard"></i></button>' +
                    '</div>' +
                '</div>';

            portArray = plan.array;
        }

        return html;
    }

    var portArray = null;

    $('#wizardPreview').on('click', '.dz-array-tab', function () {
        $('.dz-array-tab').removeClass('active');
        $(this).addClass('active');
        $('#portArrayValue').val(portArray ? portArray[$(this).data('array')] : '');
    });

    $('#wizardPreview').on('click', '#copyPortArray', function () {
        var $field = $('#portArrayValue');

        $field[0].select();
        $field[0].setSelectionRange(0, 99999);

        var done = function () {
            var $button = $('#copyPortArray');

            $button.html('<i class="fa fa-check"></i>');
            setTimeout(function () { $button.html('<i class="fa fa-clipboard"></i>'); }, 1400);
        };

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText($field.val()).then(done, function () {
                document.execCommand('copy');
                done();
            });

            return;
        }

        document.execCommand('copy');
        done();
    });
    @endif

    function escapeHtml(value) {
        return $('<div>').text(value === null || value === undefined ? '' : value).html();
    }
    </script>
@endsection
