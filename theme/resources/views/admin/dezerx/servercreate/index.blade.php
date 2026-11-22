@extends('layouts.admin')

@section('title')
    Server Create
@endsection

@section('scripts')
    @parent
    <style>
        .dz-switch {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 12px;
            padding: 0;
            border: 0;
            background: transparent;
            cursor: pointer;
            font-weight: 400;
            color: var(--sa-ink, #cad1d8);
        }

        .dz-switch:hover .dz-switch-text strong { color: var(--sa-strong, #fff); }
        .dz-switch input { position: absolute; opacity: 0; width: 0; height: 0; }

        .dz-switch-track {
            position: relative;
            flex: 0 0 auto;
            width: 42px;
            height: 24px;
            border-radius: 999px;
            background: var(--sa-field-edge, #606d7b);
            transition: background-color .18s ease;
        }

        .dz-switch-track::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
            transition: transform .18s ease;
        }

        .dz-switch input:checked + .dz-switch-track { background: var(--sa-accent, #0967d3); }
        .dz-switch input:checked + .dz-switch-track::after { transform: translateX(18px); }
        .dz-switch input:focus-visible + .dz-switch-track { box-shadow: 0 0 0 3px var(--sa-ring, rgba(9, 103, 211, .35)); }

        .dz-switch-text { line-height: 1.35; }
        .dz-switch-text strong { display: block; }
        .dz-switch-text small { color: var(--sa-muted, #9aa5b1); }

        .dz-check {
            display: inline-flex;
            align-items: center;
            gap: 9px;
            margin: 0 0 6px;
            font-weight: 400;
            color: var(--sa-ink, #cad1d8);
            cursor: pointer;
        }

        .dz-check input { position: absolute; opacity: 0; width: 0; height: 0; }

        .dz-check-box {
            position: relative;
            flex: 0 0 auto;
            width: 18px;
            height: 18px;
            border-radius: 5px;
            background: var(--sa-field, #515f6cbb);
            box-shadow: inset 0 0 0 1px var(--sa-field-edge, #606d7b);
            transition: background-color .15s ease, box-shadow .15s ease;
        }

        .dz-check-box::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 6px;
            width: 4px;
            height: 8px;
            border: solid var(--sa-on-accent, #fff);
            border-width: 0 2px 2px 0;
            transform: rotate(45deg) scale(.4);
            opacity: 0;
            transition: transform .15s ease, opacity .15s ease;
        }

        .dz-check:hover .dz-check-box { box-shadow: inset 0 0 0 1px var(--sa-field-hover, #7b8794); }
        .dz-check input:checked + .dz-check-box { background: var(--sa-accent, #0967d3); box-shadow: inset 0 0 0 1px var(--sa-accent, #0967d3); }
        .dz-check input:checked + .dz-check-box::after { transform: rotate(45deg) scale(1); opacity: 1; }
        .dz-check input:focus-visible + .dz-check-box { box-shadow: inset 0 0 0 1px var(--sa-accent, #0967d3), 0 0 0 3px var(--sa-ring, rgba(9, 103, 211, .35)); }
        .dz-check-text small { color: var(--sa-muted, #9aa5b1); }

        .dz-sizing { margin: 0 0 10px; padding: 0; border: 0; background: transparent; }
        .dz-sizing-table { margin-bottom: 10px; background: transparent; }
        .dz-sizing-table th { font-size: 11px; font-weight: 600; color: var(--sa-muted, #9aa5b1); border-bottom: 1px solid var(--sa-line, #4d5b69); }
        .dz-sizing-table td { vertical-align: middle; border-top: 0; padding: 4px 4px; }
        .dz-sizing-label { font-size: 12px; color: var(--sa-ink, #cad1d8); white-space: nowrap; }

        .dz-picks {
            max-height: 340px;
            overflow-y: auto;
            padding: 0 4px 0 0;
            border: 0;
            background: transparent;
        }

        .dz-picks .dz-nest { margin: 14px 0 6px; font-weight: 600; color: var(--sa-ink, #cad1d8); }
        .dz-picks .dz-nest:first-child { margin-top: 0; }
        .dz-picks small { color: var(--sa-muted, #9aa5b1); }

        .dz-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0 14px; }

        .dz-location {
            display: grid;
            grid-template-columns: minmax(120px, 1fr) minmax(0, 2fr);
            align-items: center;
            gap: 10px;
            padding: 5px 0;
        }

        .dz-location .dz-check { margin: 0; }

        @media (max-width: 767px) {
            .dz-location { grid-template-columns: 1fr; gap: 4px; }
        }

        .dz-pick-tools { margin-bottom: 10px; }
        .dz-pick-tools a { font-size: 12px; margin-right: 10px; cursor: pointer; }
    </style>
@endsection

@section('content-header')
    <h1>Server Create<small>Letting people build their own server from the dashboard.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.dezerx.addons') }}">KTS Host Addons</a></li>
        <li class="active">Server Create</li>
    </ol>
@endsection

@section('content')
@php
    $on = fn (string $key) => (bool) ($config[$key] ?? false);
    $value = fn (string $key) => $config[$key] ?? '';
    $ready = $config['eggs'] !== [] && $config['locations'] !== [];
@endphp

@if ($config['enabled'] && ! $ready)
    <div class="callout callout-warning">
        <h4>The page is switched on but has nothing to offer</h4>
        <p>
            Nobody sees the Create Server button until at least one location and one egg are ticked below. Until
            then the button stays hidden and the endpoints answer as though the feature were off.
        </p>
    </div>
@endif

<form action="{{ route('admin.dezerx.servercreate.update') }}" method="POST">
    <div class="row">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">The feature</h3></div>

                <div class="box-body">
                    <label class="dz-switch">
                        <input type="checkbox" name="enabled" value="1" @if ($on('enabled')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let people create their own server</strong>
                            <small>{{ $on('enabled') ? 'On, a Create Server button appears on the dashboard.' : 'Off, the button is hidden and every endpoint answers 404.' }}</small>
                        </span>
                    </label>

                    <p class="text-muted small">
                        A server made here belongs to whoever made it and behaves like any other: they get the console,
                        the files, the databases and everything else their permissions allow. What is different is that
                        the panel remembers it handed the server out, counts it against that person's allowance, and,
                        if renewals are on, gives it a date it has to be kept alive past.
                    </p>

                    <div class="form-group">
                        <label class="control-label">Name prefix</label>
                        <input type="text" name="name_prefix" class="form-control" maxlength="24"
                               value="{{ $value('name_prefix') }}" placeholder="Free" />
                        <p class="text-muted small">
                            Put in front of whatever the person types, so <code>Free</code> turns
                            <em>survival</em> into <em>Free survival</em>. Handy for spotting these in the server list.
                            Leave it empty to use their name as typed.
                        </p>
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Where they may go</h3>
                    <div class="box-tools pull-right"><span class="label label-default">{{ count($config['locations']) }} picked</span></div>
                </div>

                <div class="box-body">
                    @if ($locations->isEmpty())
                        <p class="text-muted">
                            There are no locations yet. <a href="{{ route('admin.locations') }}">Make one</a> and point
                            a node at it first.
                        </p>
                    @else
                        <div class="dz-pick-tools">
                            <a class="dz-all" data-scope="locations">Select all</a>
                            <a class="dz-none" data-scope="locations">Select none</a>
                        </div>

                        <div class="dz-picks" data-scope="locations">
                            @foreach ($locations as $location)
                                <div class="dz-location">
                                    <label class="dz-check">
                                        <input type="checkbox" name="locations[]" value="{{ $location->id }}"
                                               @if (in_array($location->id, $config['locations'], true)) checked @endif />
                                        <span class="dz-check-box"></span>
                                        <span class="dz-check-text">
                                            {{ $location->short }}
                                            <small>({{ $location->nodes_count }} {{ $location->nodes_count === 1 ? 'node' : 'nodes' }})</small>
                                        </span>
                                    </label>

                                    <input type="text" class="form-control input-sm" maxlength="120"
                                           name="location_notes[{{ $location->id }}]"
                                           placeholder="Ryzen 9 7950X · NVMe · 1 Gbit"
                                           value="{{ $config['location_notes'][$location->id] ?? '' }}" />
                                </div>
                            @endforeach
                        </div>

                        <p class="text-muted small">
                            The person picks one of these and the panel finds a public node inside it with room for the
                            memory and the disk below, then a free port on that node. A location whose nodes are full
                            is shown as full rather than hidden, so nobody wonders where it went.
                        </p>

                        <p class="text-muted small">
                            The line beside each one is shown under its name on the create page, which is where to put
                            the processor, the disks or anything else worth knowing before somebody picks. Leave it
                            empty and the location's own description is used instead.
                        </p>
                    @endif
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">What they may run</h3>
                    <div class="box-tools pull-right"><span class="label label-default">{{ count($config['eggs']) }} picked</span></div>
                </div>

                <div class="box-body">
                    @if ($nests->isEmpty())
                        <p class="text-muted">There are no nests yet.</p>
                    @else
                        <div class="dz-pick-tools">
                            <a class="dz-all" data-scope="eggs">Select all</a>
                            <a class="dz-none" data-scope="eggs">Select none</a>
                        </div>

                        <div class="dz-picks" data-scope="eggs">
                            @foreach ($nests as $nest)
                                @if ($nest->eggs->isNotEmpty())
                                    <p class="dz-nest">{{ $nest->name }}</p>

                                    <div class="dz-grid">
                                        @foreach ($nest->eggs->sortBy('name') as $egg)
                                            <label class="dz-check">
                                                <input type="checkbox" name="eggs[]" value="{{ $egg->uuid }}"
                                                       @if (in_array($egg->uuid, $config['eggs'], true)) checked @endif />
                                                <span class="dz-check-box"></span>
                                                <span class="dz-check-text">{{ $egg->name }}</span>
                                            </label>
                                        @endforeach
                                    </div>
                                @endif
                            @endforeach
                        </div>

                        <p class="text-muted small">
                            Each of these becomes a card on the create page. The server is built from the egg's own
                            startup line, its first docker image and its default variables, exactly as though an
                            administrator had made it, so an egg that installs cleanly by hand installs cleanly here.
                        </p>
                    @endif

                    <label class="dz-switch" style="margin-top: 12px;">
                        <input type="checkbox" name="variables" value="1" @if ($on('variables')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let them fill in the egg's own options</strong>
                            <small>{{ $on('variables') ? 'The version, the world seed and anything else the egg marks as editable.' : 'Every variable takes the egg default and the form asks nothing.' }}</small>
                        </span>
                    </label>
                    <p class="text-muted small">
                        Only variables an egg marks as both viewable <em>and</em> editable are offered, which are the
                        same ones a server owner could change afterwards from the Startup tab. The egg's own rules are
                        applied to whatever they type, so nothing invalid gets through.
                    </p>
                </div>
            </div>
        </div>

        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">What each server gets</h3></div>

                <div class="box-body">
                    <div class="row">
                        @unless ($on('custom_resources'))
                            <div class="col-xs-6 form-group">
                                <label class="control-label">Memory, in MiB</label>
                                <input type="number" name="memory" class="form-control" min="0" max="{{ $ceilings['memory'] }}"
                                       value="{{ $value('memory') }}" />
                                <p class="text-muted small"><code>0</code> is unlimited.</p>
                            </div>

                            <div class="col-xs-6 form-group">
                                <label class="control-label">Disk, in MiB</label>
                                <input type="number" name="disk" class="form-control" min="0" max="{{ $ceilings['disk'] }}"
                                       value="{{ $value('disk') }}" />
                                <p class="text-muted small"><code>0</code> is unlimited.</p>
                            </div>

                            <div class="col-xs-6 form-group">
                                <label class="control-label">CPU, in percent</label>
                                <input type="number" name="cpu" class="form-control" min="0" max="{{ $ceilings['cpu'] }}"
                                       value="{{ $value('cpu') }}" />
                                <p class="text-muted small">100 is one core. <code>0</code> is unlimited.</p>
                            </div>
                        @endunless

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Swap, in MiB</label>
                            <input type="number" name="swap" class="form-control" min="-1" max="{{ $ceilings['swap'] }}"
                                   value="{{ $value('swap') }}" />
                            <p class="text-muted small"><code>0</code> none, <code>-1</code> unlimited.</p>
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Block IO weight</label>
                            <input type="number" name="io" class="form-control" min="10" max="1000"
                                   value="{{ $value('io') }}" />
                            <p class="text-muted small">Between 10 and 1000. 500 unless you know otherwise.</p>
                        </div>

                        @unless ($on('custom_resources'))
                            <div class="col-xs-6 form-group">
                                <label class="control-label">Databases</label>
                                <input type="number" name="databases" class="form-control" min="0" max="{{ $ceilings['databases'] }}"
                                       value="{{ $value('databases') }}" />
                                <p class="text-muted small">How many they may make on the server.</p>
                            </div>

                            <div class="col-xs-6 form-group">
                                <label class="control-label">Extra ports</label>
                                <input type="number" name="allocations" class="form-control" min="0" max="{{ $ceilings['allocations'] }}"
                                       value="{{ $value('allocations') }}" />
                                <p class="text-muted small">Beyond the one it is given to start with.</p>
                            </div>

                            <div class="col-xs-6 form-group">
                                <label class="control-label">Backups</label>
                                <input type="number" name="backups" class="form-control" min="0" max="{{ $ceilings['backups'] }}"
                                       value="{{ $value('backups') }}" />
                                <p class="text-muted small"><code>0</code> stops them taking any.</p>
                            </div>
                        @endunless
                    </div>

                    <label class="dz-switch">
                        <input type="checkbox" name="custom_resources" value="1" @if ($on('custom_resources')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let people size their own servers</strong>
                            <small>{{ $on('custom_resources') ? 'Each person sizes their own, from the smallest below up to whatever they have left.' : 'Every server is handed out at exactly the figures above.' }}</small>
                        </span>
                    </label>

                    @if ($on('custom_resources'))
                        <div class="dz-sizing">
                            <p class="text-muted small">
                                Every account is handed the figures on the right and spends them on the servers it
                                builds. Somebody given 8192 MiB can put it into one server of 8192, two of 4096, or
                                four of 2048, and gets the whole of a server's memory back the moment they delete it.
                                <strong>Opens at</strong> is where the create form starts each figure before anybody
                                touches it, and <strong>smallest</strong> is as low as they may drag it, which is what
                                stops somebody turning their memory into thirty servers of nothing.
                            </p>

                            <table class="table table-condensed dz-sizing-table">
                                <tr>
                                    <th></th>
                                    <th>Opens at</th>
                                    <th>Smallest one server may be</th>
                                    <th>Each account gets</th>
                                </tr>

                                @foreach ([
                                    'memory' => 'Memory, in MiB',
                                    'disk' => 'Disk, in MiB',
                                    'cpu' => 'CPU, in percent',
                                    'databases' => 'Databases',
                                    'allocations' => 'Extra ports',
                                    'backups' => 'Backups',
                                ] as $key => $label)
                                    <tr>
                                        <td class="dz-sizing-label">{{ $label }}</td>
                                        <td>
                                            <input type="number" name="{{ $key }}" class="form-control input-sm"
                                                   min="0" max="{{ $ceilings[$key] }}" value="{{ $value($key) }}" />
                                        </td>
                                        <td>
                                            <input type="number" name="min_{{ $key }}" class="form-control input-sm"
                                                   min="0" max="{{ $ceilings[$key] }}" value="{{ $value('min_' . $key) }}" />
                                        </td>
                                        <td>
                                            <input type="number" name="pool_{{ $key }}" class="form-control input-sm"
                                                   min="0" max="{{ $ceilings['pool_' . $key] }}" value="{{ $value('pool_' . $key) }}" />
                                        </td>
                                    </tr>
                                @endforeach
                            </table>

                            <p class="text-muted small">
                                Leave a figure at <code>0</code> on the right and that resource is not counted at all:
                                every server is then built at the size above, however many of them one person makes,
                                and only the server limit holds them back. Somebody with too little left to build even
                                the smallest server is told they have run out, the same way somebody at their server
                                limit is. Only servers this feature handed out count towards what somebody has spent,
                                so a server an administrator built for them by hand costs them nothing. One account
                                can be given figures of its own, and shown what it is already using, on its own page
                                under Users.
                            </p>

                            <div class="row">
                                <div class="col-xs-4 form-group">
                                    <label class="control-label">Processor field counts in</label>
                                    <select name="cpu_unit" class="form-control">
                                        @foreach ($cpuUnits as $key => $label)
                                            <option value="{{ $key }}" @if ($value('cpu_unit') === $key) selected @endif>{{ $label }}</option>
                                        @endforeach
                                    </select>
                                </div>

                                <div class="col-xs-4 form-group">
                                    <label class="control-label">Memory field counts in</label>
                                    <select name="memory_unit" class="form-control">
                                        @foreach ($sizeUnits as $key => $label)
                                            <option value="{{ $key }}" @if ($value('memory_unit') === $key) selected @endif>{{ $label }}</option>
                                        @endforeach
                                    </select>
                                </div>

                                <div class="col-xs-4 form-group">
                                    <label class="control-label">Disk field counts in</label>
                                    <select name="disk_unit" class="form-control">
                                        @foreach ($sizeUnits as $key => $label)
                                            <option value="{{ $key }}" @if ($value('disk_unit') === $key) selected @endif>{{ $label }}</option>
                                        @endforeach
                                    </select>
                                </div>
                            </div>

                            <p class="text-muted small no-margin">
                                Only how the create page reads. Every figure is stored in the panel's own unit
                                whichever of these is picked: percent for the processor, MiB for the other two.
                                Whoever is filling the form can flip a field from the field itself.
                            </p>
                        </div>
                    @endif

                    <label class="dz-switch">
                        <input type="checkbox" name="oom_disabled" value="1" @if ($on('oom_disabled')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Disable the OOM killer</strong>
                            <small>{{ $on('oom_disabled') ? 'A server over its memory limit is left running.' : 'The kernel kills a server that goes over its memory limit.' }}</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="start_on_completion" value="1" @if ($on('start_on_completion')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Start it as soon as it has installed</strong>
                            <small>{{ $on('start_on_completion') ? 'They land on a server that is already coming up.' : 'They press start themselves.' }}</small>
                        </span>
                    </label>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Who, and how many</h3></div>

                <div class="box-body">
                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Servers per person</label>
                            <input type="number" name="per_user" class="form-control" min="0" max="{{ $ceilings['per_user'] }}"
                                   value="{{ $value('per_user') }}" />
                            <p class="text-muted small">
                                <code>0</code> means no limit at all, which on a public panel means one person can take
                                everything. Leave it at 1 unless you mean otherwise.
                            </p>
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Across the whole panel</label>
                            <input type="number" name="total" class="form-control" min="0" max="{{ $ceilings['total'] }}"
                                   value="{{ $value('total') }}" />
                            <p class="text-muted small">
                                A hard ceiling on how many of these exist at once. <code>0</code> is no ceiling. Once it
                                is reached the page says so rather than failing at the end.
                            </p>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Minimum account age, in hours</label>
                        <input type="number" name="min_account_age_hours" class="form-control" min="0"
                               max="{{ $ceilings['min_account_age_hours'] }}" value="{{ $value('min_account_age_hours') }}" />
                        <p class="text-muted small">
                            An account younger than this is told to come back later. The cheapest thing there is
                            against somebody signing up twenty times in an afternoon. <code>0</code> turns it off.
                        </p>
                    </div>

                    <label class="dz-switch">
                        <input type="checkbox" name="require_totp" value="1" @if ($on('require_totp')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Require two factor authentication</strong>
                            <small>{{ $on('require_totp') ? 'An account without it is sent to set it up first.' : 'Anybody with an account may create one.' }}</small>
                        </span>
                    </label>
                    <p class="text-muted small">
                        Demo accounts are refused whatever this says. So is anybody who already holds as many as the
                        figures above allow.
                    </p>

                    <hr />

                    <label class="dz-switch">
                        <input type="checkbox" name="discord_required" value="1"
                               @if ($on('discord_required')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Require a linked Discord account</strong>
                            <small>{{ $on('discord_required') ? 'They authorise with Discord before the form will let them through.' : 'Off, no Discord account is asked for.' }}</small>
                        </span>
                    </label>

                    <p class="text-muted small">
                        A Discord account is a great deal more work to make twenty of than an email address is, which is
                        what makes this worth asking for. <strong>One Discord reaches one panel account</strong>;
                        authorising with one that is already linked elsewhere is refused, so signing up again does not
                        get around the limits above. Leaving the fields below empty switches the requirement off however
                        this is set, rather than locking everybody out of a half-filled page.
                    </p>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Client ID</label>
                            <input type="text" name="discord_client_id" class="form-control" autocomplete="off"
                                   value="{{ $value('discord_client_id') }}" />
                            <p class="text-muted small">
                                From your application's OAuth2 page.
                            </p>
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Client secret</label>
                            <input type="password" name="discord_client_secret" class="form-control"
                                   autocomplete="new-password"
                                   placeholder="{{ $value('discord_client_secret') !== '' ? 'Set. Type to replace it.' : 'Not set' }}" />
                            <p class="text-muted small">
                                Never shown again once saved. Leave it empty to keep the one you have.
                            </p>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Bot token</label>
                            <input type="password" name="discord_bot_token" class="form-control"
                                   autocomplete="new-password"
                                   placeholder="{{ $value('discord_bot_token') !== '' ? 'Set. Type to replace it.' : 'Not set' }}" />
                            <p class="text-muted small">
                                Used to pull them into your Discord server the moment they authorise. Leave it empty to
                                keep the one you have.
                            </p>
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Server ID</label>
                            <input type="text" name="discord_guild_id" class="form-control" autocomplete="off"
                                   value="{{ $value('discord_guild_id') }}" />
                            <p class="text-muted small">
                                The Discord server they are added to. Right-click it with developer mode on to copy the
                                id. Without this and a bot token they are only asked to authorise, not added.
                            </p>
                        </div>
                    </div>

                    <p class="text-muted small">
                        Add <code>{{ route('dezerx.discord.callback') }}</code> to the application's OAuth2 redirects,
                        and invite the bot to the server with the <code>Create Instant Invite</code> permission, or the
                        join will be refused and they will simply be linked without it.
                    </p>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Renewals</h3></div>

                <div class="box-body">
                    <label class="dz-switch">
                        <input type="checkbox" name="renew_enabled" value="1" @if ($on('renew_enabled')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Make them press a button to keep it</strong>
                            <small>{{ $on('renew_enabled') ? 'Every server has a date it has to be renewed past.' : 'Off, a server handed out is kept for good.' }}</small>
                        </span>
                    </label>

                    <p class="text-muted small">
                        What stops a panel filling up with servers nobody has opened since March. Turning this off
                        leaves the dates where they are and stops acting on them, so turning it back on picks up where
                        it left off.
                    </p>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Renew every</label>
                            <input type="number" name="renew_every" class="form-control" min="1"
                                   max="{{ $ceilings['renew_every'] }}" value="{{ $value('renew_every') }}" />
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">&nbsp;</label>
                            <select name="renew_unit" class="form-control">
                                @foreach ($units as $unit => $label)
                                    <option value="{{ $unit }}" @if ($config['renew_unit'] === $unit) selected @endif>{{ $label }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Renewable from, in hours</label>
                            <input type="number" name="renew_window_hours" class="form-control" min="0"
                                   max="{{ $ceilings['renew_window_hours'] }}" value="{{ $value('renew_window_hours') }}" />
                            <p class="text-muted small">
                                How close to the date the button starts working. <code>0</code> lets them renew whenever
                                they like, which with a long period means one visit buys years.
                            </p>
                        </div>

                        <div class="col-xs-6 form-group">
                            <label class="control-label">Grace period, in hours</label>
                            <input type="number" name="grace_hours" class="form-control" min="0"
                                   max="{{ $ceilings['grace_hours'] }}" value="{{ $value('grace_hours') }}" />
                            <p class="text-muted small">
                                How long after the date the panel waits before acting. Renewing inside the grace
                                period still works.
                            </p>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="control-label">When the date passes</label>
                        <select name="expire_action" class="form-control">
                            @foreach ($actions as $action => $label)
                                <option value="{{ $action }}" @if ($config['expire_action'] === $action) selected @endif>{{ $label }}</option>
                            @endforeach
                        </select>
                        <p class="text-muted small">{{ $hints[$config['expire_action']] ?? '' }}</p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Delete a suspended one after, in days</label>
                        <input type="number" name="purge_days" class="form-control" min="0"
                               max="{{ $ceilings['purge_days'] }}" value="{{ $value('purge_days') }}" />
                        <p class="text-muted small">
                            Only applies when the action above is suspend. After this long with nobody renewing it, the
                            server is removed for real. <code>0</code> keeps suspended servers for ever, which is safe
                            but fills the node up.
                        </p>
                    </div>

                    @if ($on('renew_enabled'))
                        <p class="text-muted small">
                            A server made now would fall due in <strong>{{ \Pterodactyl\Services\Dezerx\ServerCreate\ServerCreate::period() }}</strong>.
                            Dates are handled in <code>{{ $timezone }}</code>, and the sweep runs every five minutes,
                            so <code>php artisan schedule:run</code> has to be running on this box for any of it to
                            happen.
                        </p>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">How many each node may take</h3>
                    <div class="box-tools pull-right">
                        <span class="label label-default">{{ count($config['node_limits']) }} capped</span>
                    </div>
                </div>

                <div class="box-body">
                    @if ($nodes->isEmpty())
                        <p class="text-muted no-margin">There are no nodes yet.</p>
                    @else
                        <div class="table-responsive">
                            <table class="table table-condensed">
                                <tbody>
                                    <tr>
                                        <th>Node</th>
                                        <th>Location</th>
                                        <th class="text-center">Servers on it</th>
                                        <th class="text-center">Free ports</th>
                                        <th class="text-center">Room for</th>
                                        <th style="width: 130px;">Cap</th>
                                    </tr>

                                    @foreach ($nodes as $node)
                                        @php($room = $capacity[$node->id] ?? null)
                                        @php($offered = in_array($node->location_id, $config['locations'], true))
                                        <tr>
                                            <td>
                                                <a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a>

                                                @if (! $node->public)
                                                    <span class="label label-default">private</span>
                                                @endif
                                            </td>
                                            <td>
                                                {{ $locations->firstWhere('id', $node->location_id)?->short ?? '-' }}

                                                @if (! $offered)
                                                    <span class="text-muted small">(not offered)</span>
                                                @endif
                                            </td>
                                            <td class="text-center"><code>{{ $node->servers_count }}</code></td>
                                            <td class="text-center">
                                                <code>{{ $room === null ? '-' : $room['free'] }}</code>
                                            </td>
                                            <td class="text-center">
                                                @if ($room === null)
                                                    <span class="text-muted">-</span>
                                                @elseif ($room['slots'] === 0)
                                                    <span class="label label-warning">full</span>
                                                @else
                                                    <code>{{ $room['slots'] }}</code>
                                                @endif
                                            </td>
                                            <td>
                                                <input type="number" class="form-control input-sm" min="0"
                                                       max="{{ $ceilings['total'] }}" placeholder="no cap"
                                                       name="node_limits[{{ $node->id }}]"
                                                       value="{{ $config['node_limits'][$node->id] ?? '' }}" />
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>

                        <p class="text-muted small no-margin">
                            <strong>Cap</strong> is the most servers this feature will ever put on one node. Leave it
                            empty and the node simply takes them until its memory, its disk or its ports run out.
                            <strong>Room for</strong> is how many more would fit right now with everything else on this
                            page taken into account, and it is the figure the create page shows people as free slots.
                            Only servers handed out by this feature count towards a cap: anything you or a customer
                            made another way is counted under <strong>Servers on it</strong> but left out of the cap.
                            A private node is never used here, whatever is typed.
                        </p>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save</button>
                    <p class="text-muted small no-margin" style="padding-top: 7px;">
                        Changes take effect at once. Servers already handed out keep the resources they were built
                        with; changing the figures above only changes what the next one gets.
                    </p>
                </div>
            </div>
        </div>
    </div>
</form>

<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Servers handed out</h3>
                <div class="box-tools pull-right">
                    <span class="label label-default">{{ $total }} in total</span>
                </div>
            </div>

            @if ($issued->isEmpty())
                <div class="box-body">
                    <p class="text-muted no-margin">Nobody has made one yet.</p>
                </div>
            @else
                <div class="box-body table-responsive no-padding">
                    <table class="table table-hover">
                        <tbody>
                            <tr>
                                <th>Server</th>
                                <th>Owner</th>
                                <th>Renews</th>
                                <th class="text-center">Renewed</th>
                                <th></th>
                            </tr>

                            @foreach ($issued as $entry)
                                <tr>
                                    <td>
                                        @if ($entry->server)
                                            <a href="{{ route('admin.servers.view', $entry->server->id) }}">{{ $entry->server->name }}</a>
                                            <br /><code class="text-muted">{{ $entry->server->uuidShort }}</code>
                                        @else
                                            <span class="text-muted">Gone</span>
                                        @endif
                                    </td>
                                    <td>
                                        @if ($entry->owner)
                                            <a href="{{ route('admin.users.view', $entry->owner->id) }}">{{ $entry->owner->username }}</a>
                                        @else
                                            <span class="text-muted">Gone</span>
                                        @endif
                                    </td>
                                    <td>
                                        @if (! $config['renew_enabled'])
                                            <span class="text-muted">Renewals are off</span>
                                        @elseif ($entry->suspended_at)
                                            <span class="label label-danger">Suspended</span>
                                            <small class="text-muted">since {{ $entry->suspended_at->format('D j M Y, H:i') }}</small>
                                        @elseif ($entry->renew_at === null)
                                            <span class="text-muted">No date yet</span>
                                        @else
                                            <span class="{{ $entry->isOverdue() ? 'text-red' : '' }}">
                                                {{ $entry->renew_at->format('D j M Y, H:i') }}
                                            </span>
                                            <small class="text-muted">({{ $entry->renew_at->diffForHumans() }})</small>
                                        @endif
                                    </td>
                                    <td class="text-center"><code>{{ $entry->renewals }}</code></td>
                                    <td class="text-right">
                                        @if ($config['renew_enabled'])
                                            <form action="{{ route('admin.dezerx.servercreate.renew', $entry->id) }}"
                                                  method="POST" style="display:inline">
                                                {!! csrf_field() !!}
                                                <button type="submit" class="btn btn-xs btn-default">Renew</button>
                                            </form>
                                        @endif

                                        <form action="{{ route('admin.dezerx.servercreate.release', $entry->id) }}"
                                              method="POST" style="display:inline"
                                              onsubmit="return confirm('Stop tracking this server? It stays exactly as it is and its owner keeps it, but it stops counting against their allowance and will never fall due again.')">
                                            {!! csrf_field() !!}
                                            {!! method_field('DELETE') !!}
                                            <button type="submit" class="btn btn-xs btn-default">Release</button>
                                        </form>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif

            <div class="box-footer">
                <p class="text-muted small no-margin">
                    The fifty nearest their date. <strong>Renew</strong> pushes one out by a full period and brings it
                    back if the panel had suspended it. <strong>Release</strong> hands the server over for good: it
                    stays where it is and keeps working, but stops being one of these.
                </p>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <script>
        (function () {
            function boxes(scope) {
                return $('.dz-picks[data-scope="' + scope + '"] input[type="checkbox"]');
            }

            $('.dz-all').on('click', function () {
                boxes($(this).data('scope')).prop('checked', true);
            });

            $('.dz-none').on('click', function () {
                boxes($(this).data('scope')).prop('checked', false);
            });
        })();
    </script>
@endsection
