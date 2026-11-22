@extends('layouts.admin')

@section('title')
    Allocation Folders
@endsection

@section('content-header')
    <h1>Allocation Folders<small>Sorting a node's allocations into folders, without moving anything.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.dezerx.addons') }}">KTS Host Addons</a></li>
        <li class="active">Allocation Folders</li>
    </ol>
@endsection

@section('scripts')
    @parent
    <style>
        .dz-hint { color: var(--sa-muted, #9aa5b1); }
        .dz-switch { font-weight: normal; }
        .dz-nodes td { padding: 6px 8px; vertical-align: middle; }
        .dz-feature { padding: 10px 0; border-top: 1px solid var(--sa-line, #4d5b69); }
        .dz-feature:first-child { border-top: 0; padding-top: 0; }
        .dz-feature h4 { margin: 0 0 3px; font-size: 14px; font-weight: 600; color: var(--sa-ink, #cad1d8); }
        .dz-feature p { margin: 0; font-size: 12px; color: var(--sa-muted, #9aa5b1); }
        .dz-feature .fa { width: 20px; color: var(--sa-accent, #099aa5); }

        .dz-cat { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--sa-muted, #9aa5b1); margin: 12px 0 5px; }
        .dz-cat:first-child { margin-top: 0; }

        .dz-game {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            margin: 0 4px 4px 0;
            padding: 3px 9px 3px 4px;
            border-radius: 12px;
            background: var(--sa-page, #33404d);
            box-shadow: inset 0 0 0 1px var(--sa-line, #4d5b69);
            color: var(--sa-ink, #cad1d8);
            font-size: 12px;
        }

        .dz-game .fa {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #fff;
        }
    </style>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-12">
        <div class="box box-default">
            <div class="box-body">
                <p class="text-muted small no-margin">
                    Switched on, every node's <strong>Allocation</strong> tab grows a list of folders down the side.
                    Each IP on the node is a folder already, so a node with four IPs sorts itself the moment you turn
                    this on. On top of that you can add folders of your own with an icon, a colour and a note, let the
                    auto-sorter read the node and write them for you, and lay out the ports for a game you are about to
                    sell without working out a single number by hand.
                </p>
                <p class="text-muted small" style="margin-top: 8px; margin-bottom: 0;">
                    This is a way of <em>looking</em> at allocations and nothing more. No allocation is changed, moved
                    or renamed by a folder, the API answers exactly what it answered before, and turning this off leaves
                    you with the plain list you had. All the panel remembers is a folder's name, what it is wearing, and
                    which allocation ids you filed into it.
                </p>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-sm-5">
        <form action="{{ route('admin.dezerx.allocationfolders.update') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Folders</h3></div>

                <div class="box-body">
                    <div class="form-group no-margin">
                        <label class="dz-switch">
                            <input type="checkbox" name="enabled" value="1" @if ($enabled) checked @endif>
                            Sort allocations into folders
                        </label>
                        <p class="small dz-hint" style="margin-top: 6px;">
                            Off by default. Nothing you have set up is forgotten while it is off. Turning it
                            back on brings every folder back exactly as it was.
                        </p>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary btn-sm pull-right">Save</button>
                </div>
            </div>
        </form>

        <div class="box box-default">
            <div class="box-header with-border"><h3 class="box-title">What you get on a node</h3></div>

            <div class="box-body">
                <div class="dz-feature">
                    <h4><i class="fa fa-magic"></i> Auto-sort</h4>
                    <p>
                        Reads the whole node and writes the folders for you. An allocation attached to a server is
                        read from the egg that server was built from, so a txAdmin port on a number nobody would
                        guess still lands in the FiveM folder beside its game port; the spare ones are worked out
                        from the port, leaning on what the node already runs. It shows you what it found before it
                        does anything, and leaves anything it cannot place exactly where it is.
                    </p>
                </div>

                <div class="dz-feature">
                    <h4><i class="fa fa-list-ol"></i> Port planner</h4>
                    <p>
                        Pick a game and it tells you the ports it wants, how many per server, and the extra ones its
                        egg needs on top: txAdmin, RCON, a Steam query port, a web map. Say how many servers you are
                        selling and it lays the blocks out, skips anything already on the IP, shows you the plan, then
                        creates the allocations and files them in one go.
                    </p>
                </div>

                <div class="dz-feature">
                    <h4><i class="fa fa-filter"></i> Filter and clear out</h4>
                    <p>
                        Narrow the table by port range, by IP, alias or server name, or to just the free ones, then
                        delete everything free that the range matches in one go. An allocation a server is using is
                        never touched, and the panel says how many it left behind for that reason.
                    </p>
                </div>

                <div class="dz-feature">
                    <h4><i class="fa fa-sitemap"></i> One line per server</h4>
                    <p>
                        A server holding nine allocations is one line you can open rather than nine lines repeating
                        its name, with the address you would hand a customer at the top of the group.
                    </p>
                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-7">
        <div class="box box-default">
            <div class="box-header with-border"><h3 class="box-title">Nodes</h3></div>

            <div class="box-body table-responsive no-padding">
                <table class="table table-hover dz-nodes" style="margin-bottom: 0;">
                    <tr>
                        <th>Node</th>
                        <th>Location</th>
                        <th class="text-center">Allocations</th>
                        <th class="text-center">Folders of your own</th>
                        <th></th>
                    </tr>

                    @forelse ($nodes as $node)
                        <tr>
                            <td>{{ $node->name }}</td>
                            <td class="text-muted">{{ $node->location?->short ?? '-' }}</td>
                            <td class="text-center">{{ number_format($node->allocations_count) }}</td>
                            <td class="text-center">
                                @if (($counts[$node->id] ?? 0) > 0)
                                    {{ $counts[$node->id] }}
                                @else
                                    <span class="text-muted">none yet</span>
                                @endif
                            </td>
                            <td class="text-right">
                                <a href="{{ route('admin.nodes.view.allocation', $node->id) }}"
                                   class="btn btn-xs btn-default">Open allocations</a>
                            </td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" class="text-muted text-center">There are no nodes yet.</td>
                        </tr>
                    @endforelse
                </table>
            </div>

            <div class="box-footer">
                <p class="text-muted small no-margin">
                    Folders live on the node's own Allocation tab. There is nothing to set up here beyond the switch.
                </p>
            </div>
        </div>

        <div class="box box-default">
            <div class="box-header with-border"><h3 class="box-title">Games the planner knows</h3></div>

            <div class="box-body">
                @foreach (\Pterodactyl\Services\Dezerx\Allocations\PortCatalogue::categories() as $category => $profiles)
                    <div class="dz-cat">{{ $category }}</div>

                    @foreach ($profiles as $profile)
                        <span class="dz-game" title="{{ $profile['blurb'] }}">
                            <i class="fa {{ $profile['icon'] }}" style="background: {{ $profile['color'] }}"></i>
                            {{ $profile['name'] }}
                        </span>
                    @endforeach
                @endforeach

                <p class="text-muted small no-margin" style="margin-top: 8px;">
                    A port the catalogue does not recognise is never guessed at. It stays in its IP's folder until
                    you file it somewhere yourself.
                </p>
            </div>
        </div>
    </div>
</div>
@endsection
