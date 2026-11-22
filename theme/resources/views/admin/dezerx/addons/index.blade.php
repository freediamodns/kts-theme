@extends('layouts.admin')

@section('title')
    KTS Host Addons
@endsection

@section('content-header')
    <h1>KTS Host Addons<small>Optional features that add a page to a server.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">KTS Host Addons</li>
    </ol>
@endsection

@section('content')
    <div class="row">
        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Panel features</h3>
                </div>

                <div class="box-body">
                    <div class="stark-features">
                        @foreach ([
                            ['route' => 'admin.dezerx.servercreate', 'icon' => 'fa-plus-square-o', 'name' => 'Server Create', 'blurb' => 'Letting people build their own server, and what they get when they do.'],
                            ['route' => 'admin.dezerx.billing', 'icon' => 'fa-credit-card', 'name' => 'Billing', 'blurb' => 'Read a server\'s plan, price and invoices from Paymenter or WHMCS.'],
                            ['route' => 'admin.dezerx.subdomains', 'icon' => 'fa-globe', 'name' => 'Subdomains', 'blurb' => 'Domains people may put a server on, and what is already taken.'],
                            ['route' => 'admin.dezerx.ai', 'icon' => 'fa-magic', 'name' => 'AI Companion', 'blurb' => 'The assistant in the corner of the panel: its key, its model and its limits.'],
                            ['route' => 'admin.dezerx.startup', 'icon' => 'fa-terminal', 'name' => 'Startup Commands', 'blurb' => 'Ready-made startup lines a server owner can pick from.'],
                            ['route' => 'admin.dezerx.staff', 'icon' => 'fa-life-ring', 'name' => 'Support Staff', 'blurb' => 'Letting someone you trust into a server for a while.'],
                            ['route' => 'admin.dezerx.emails', 'icon' => 'fa-envelope-o', 'name' => 'Emails', 'blurb' => 'What the panel sends, and how each message reads.'],
                            ['route' => 'admin.dezerx.importer', 'icon' => 'fa-download', 'name' => 'Server Importer', 'blurb' => 'Saved SFTP logins to import from, and what an import may reach.'],
                            ['route' => 'admin.dezerx.allocationfolders', 'icon' => 'fa-folder-open-o', 'name' => 'Allocation Folders', 'blurb' => 'Sorting a node\'s allocations into folders, without moving anything.'],
                        ] as $feature)
                            <a href="{{ route($feature['route']) }}" class="stark-feature-tile">
                                <span class="stark-feature-icon"><i class="fa {{ $feature['icon'] }}"></i></span>

                                <span class="stark-feature-text">
                                    <strong>{{ $feature['name'] }}</strong>
                                    <span>{{ $feature['blurb'] }}</span>
                                </span>

                                <i class="fa fa-angle-right stark-feature-go" aria-hidden="true"></i>
                            </a>
                        @endforeach
                    </div>
                </div>
            </div>
        </div>

        <div class="col-xs-12">
            <div class="box">
                <div class="box-header with-border stark-addons-head">
                    <h3 class="box-title">Addons</h3>

                    <div class="stark-addon-search">
                        <i class="fa fa-search" aria-hidden="true"></i>
                        <input type="text" class="form-control input-sm" id="stark-addon-filter"
                               autocomplete="off" placeholder="Search addons…" aria-label="Search addons">
                    </div>
                </div>

                <div class="box-body table-responsive no-padding">
                    <table class="table table-hover stark-addons">
                        <thead>
                            <tr>
                                <th>Addon</th>
                                <th>What it does</th>
                                <th class="text-center">Status</th>
                                <th class="text-center">Eggs</th>
                            </tr>
                        </thead>

                        <tbody>
                            @foreach ($catalogue as $key => $meta)
                                <tr data-addon="{{ strtolower($meta['name'] . ' ' . $meta['blurb'] . ' ' . $key) }}">
                                    <td>
                                        <a href="{{ route('admin.dezerx.addons.show', $key) }}" class="stark-addon-name">
                                            <span class="stark-addon-icon">
                                                @if (($meta['mark'] ?? '') !== '')
                                                    {!! $meta['mark'] !!}
                                                @else
                                                    <i class="fa {{ $meta['icon'] }}"></i>
                                                @endif
                                            </span>
                                            {{ $meta['name'] }}
                                            @if ($meta['beta'] ?? false)
                                                <span class="stark-badge is-beta" title="New: there may still be rough edges.">Beta</span>
                                            @endif
                                        </a>
                                    </td>
                                    <td class="col-xs-8 stark-addon-blurb">{{ $meta['blurb'] }}</td>
                                    <td class="text-center">
                                        @if ($addons[$key]['enabled'] ?? false)
                                            <span class="stark-badge is-good">Enabled</span>
                                        @else
                                            <span class="stark-badge is-idle">Disabled</span>
                                        @endif
                                    </td>
                                    <td class="text-center stark-count">{{ count(\Pterodactyl\Services\Dezerx\Addons::scope($key)) }}</td>
                                </tr>
                            @endforeach

                            <tr class="stark-addon-empty" style="display: none;">
                                <td colspan="4" class="text-center text-muted">Nothing matches that.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p class="stark-addons-note">
                    An addon is off until you turn it on, and shows only on the eggs you pick. Nothing is
                    installed or removed. The pages ship with the theme and are hidden until they apply.
                </p>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent
    <style>
        .stark-features {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
        }

        .stark-feature-tile:last-child:nth-child(3n+1) {
            grid-column: span 3;
        }

        .stark-feature-tile:last-child:nth-child(3n+2) {
            grid-column: span 2;
        }

        @media (max-width: 1199px) {
            .stark-features {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .stark-feature-tile:last-child:nth-child(n) {
                grid-column: auto;
            }

            .stark-feature-tile:last-child:nth-child(odd) {
                grid-column: span 2;
            }
        }

        .stark-feature-tile {
            position: relative;
            display: flex;
            align-items: flex-start;
            gap: 14px;
            padding: 16px 36px 16px 16px;
            border: 1px solid transparent;
            border-radius: 6px;
            background: var(--sa-well, #1f2933);
            color: inherit;
            transition: border-color .15s ease, background-color .15s ease, transform .15s ease;
        }

        .stark-feature-tile:hover,
        .stark-feature-tile:focus {
            border-color: var(--sa-accent, #0967d3);
            background: var(--sa-well-hover, #222e3a);
            transform: translateY(-1px);
            color: inherit;
            text-decoration: none;
        }

        .stark-feature-tile:focus-visible {
            outline: 2px solid var(--sa-accent, #0967d3);
            outline-offset: 2px;
        }

        .stark-feature-icon {
            flex: 0 0 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            border-radius: 6px;
            background: var(--sa-accent, #0967d3);
            color: var(--sa-on-accent, #fff);
            font-size: 16px;
        }

        .stark-feature-text {
            min-width: 0;
        }

        .stark-feature-text strong {
            display: block;
            margin: 1px 0 4px;
            font-size: 14px;
            font-weight: 600;
            color: var(--sa-strong, #eef1f4);
        }

        .stark-feature-text span {
            display: block;
            font-size: 12px;
            line-height: 1.5;
            color: var(--sa-muted, #9aa5b1);
        }

        .stark-feature-go {
            position: absolute;
            top: 50%;
            right: 14px;
            margin-top: -8px;
            font-size: 16px;
            color: var(--sa-faint, #6f7c89);
            transition: transform .15s ease, color .15s ease;
        }

        .stark-feature-tile:hover .stark-feature-go,
        .stark-feature-tile:focus .stark-feature-go {
            color: var(--sa-strong, #fff);
            transform: translateX(3px);
        }

        @media (max-width: 767px) {
            .stark-features {
                grid-template-columns: minmax(0, 1fr);
            }

            .stark-feature-tile:last-child:nth-child(odd) {
                grid-column: auto;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .stark-feature-tile,
            .stark-feature-go {
                transition: none;
            }

            .stark-feature-tile:hover,
            .stark-feature-tile:hover .stark-feature-go {
                transform: none;
            }
        }

        .stark-addons-head {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .stark-addons-head::before,
        .stark-addons-head::after {
            display: none;
        }

        .stark-addon-search {
            position: relative;
            width: 240px;
            margin-left: auto;
        }

        .stark-addon-search .fa {
            position: absolute;
            top: 9px;
            left: 10px;
            font-size: 12px;
            color: var(--sa-muted, #9aa5b1);
        }

        .stark-addon-search input {
            padding-left: 28px;
        }

        .stark-addons {
            margin: 0;
        }

        .stark-addons th {
            font-size: 12px;
            font-weight: 600;
            color: var(--sa-muted, #9aa5b1);
            white-space: nowrap;
        }

        .stark-addons td {
            vertical-align: middle !important;
            font-size: 13px;
        }

        .stark-addons th:first-child,
        .stark-addons td:first-child {
            padding-left: 16px;
        }

        .stark-addon-name {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: var(--sa-strong, #eef1f4);
            font-weight: 600;
            white-space: nowrap;
        }

        .stark-addon-name:hover,
        .stark-addon-name:focus {
            color: var(--sa-accent, #4d9ff2);
            text-decoration: none;
        }

        .stark-addon-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 28px;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            background: var(--sa-well, #1f2933);
            color: var(--sa-accent, #4d9ff2);
            font-size: 13px;
        }

        .stark-addon-icon svg,
        .stark-addon-icon img {
            max-width: 16px;
            max-height: 16px;
        }

        .stark-addon-blurb {
            color: var(--sa-ink, #cad1d8);
        }

        .stark-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 700;
            line-height: 1.5;
            letter-spacing: .05em;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .stark-badge.is-good {
            background: var(--sa-good-bg, #0ca30c);
            color: var(--sa-good-ink, #fff);
        }

        .stark-badge.is-beta {
            margin-left: 6px;
            padding: 1px 6px;
            font-size: 10px;
            vertical-align: 1px;
            background: var(--sa-warn-bg, #c77c02);
            color: var(--sa-warn-ink, #fff);
        }

        .stark-badge.is-idle {
            background: var(--sa-idle-bg, #56636f);
            color: var(--sa-idle-ink, #e6eaee);
        }

        .stark-count {
            font-variant-numeric: tabular-nums;
            font-weight: 600;
            color: var(--sa-strong, #eef1f4);
        }

        .stark-addons-note {
            margin: 0;
            padding: 12px 16px;
            font-size: 12px;
            color: var(--sa-muted, #9aa5b1);
        }

        @media (max-width: 767px) {
            .stark-addon-search {
                width: 150px;
            }
        }
    </style>

    <script>
        (function () {
            var field = $('#stark-addon-filter');
            var rows = $('tr[data-addon]');
            var empty = $('.stark-addon-empty');

            field.on('input', function () {
                var term = $.trim(this.value).toLowerCase();
                var shown = 0;

                rows.each(function () {
                    var match = term === '' || String($(this).data('addon')).indexOf(term) !== -1;

                    $(this).toggle(match);
                    shown += match ? 1 : 0;
                });

                empty.toggle(shown === 0);
            });
        })();
    </script>
@endsection
