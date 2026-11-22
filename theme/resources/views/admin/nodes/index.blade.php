@extends('layouts.admin')

@section('title')
    List Nodes
@endsection

@section('scripts')
    @parent
    {!! Theme::css('vendor/fontawesome/animation.min.css') !!}
@endsection

@section('content-header')
    <h1>Nodes<small>All nodes available on the system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Nodes</li>
    </ol>
@endsection

@section('content')
@php($glance = \Pterodactyl\Services\Dezerx\Overview\Overview::glance($nodes->getCollection()))
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Node List</h3>
                <div class="box-tools search01">
                    <form action="{{ route('admin.nodes') }}" method="GET">
                        <div class="input-group input-group-sm">
                            <input type="text" name="filter[name]" class="form-control pull-right" value="{{ request()->input('filter.name') }}" placeholder="Search Nodes">
                            <div class="input-group-btn">
                                <button type="submit" class="btn btn-default"><i class="fa fa-search"></i></button>
                                <a href="{{ route('admin.nodes.new') }}"><button type="button" class="btn btn-sm btn-primary" style="border-radius: 0 3px 3px 0;margin-left:-1px;">Create New</button></a>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th></th>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Memory</th>
                            <th>Disk</th>
                            <th class="text-center">Servers</th>
                            <th class="text-center">SSL</th>
                            <th class="text-center">Public</th>
                        </tr>
                        @foreach ($nodes as $node)
                            <tr>
                                <td class="text-center text-muted left-icon" data-action="ping" data-secret="{{ $node->getDecryptedKey() }}" data-location="{{ $node->scheme }}://{{ $node->fqdn }}:{{ $node->daemonListen }}/api/system"><i class="fa fa-fw fa-refresh fa-spin"></i></td>
                                <td>
                                    {!! $node->maintenance_mode ? '<span class="label label-warning"><i class="fa fa-wrench"></i></span> ' : '' !!}<a href="{{ route('admin.nodes.view', $node->id) }}">{{ $node->name }}</a>
                                    
                                    @if ($g = $glance[$node->id] ?? null)
                                        <div class="nd-glance">
                                            <span class="nd-dot is-{{ $g['status'] }}" aria-hidden="true"></span>
                                            @if ($g['status'] === 'online')
                                                <span>{{ $g['running'] }} of {{ $node->servers_count }} running</span>
                                                @if ($g['cpu'] !== null)<span>CPU {{ $g['cpu'] }}%</span>@endif
                                                <span>RAM {{ $g['memory'] }}@if ($g['physical']) of {{ $g['physical'] }}@endif</span>
                                                @if ($g['trend'])
                                                    <svg class="nd-spark" viewBox="0 0 72 18" width="72" height="18" role="img" aria-label="Memory over the last 24 hours, peak {{ $g['trend']['peak'] }}">
                                                        <title>Memory over the last 24 hours, peak {{ $g['trend']['peak'] }}</title>
                                                        <polygon points="{{ $g['trend']['area'] }}" />
                                                        <polyline points="{{ $g['trend']['points'] }}" />
                                                    </svg>
                                                @endif
                                            @elseif ($g['status'] === 'unreachable')
                                                <span title="{{ $g['error'] }}">Not answering</span>
                                            @else
                                                <span>Not sampled yet</span>
                                            @endif
                                        </div>
                                    @endif
                                </td>
                                <td>
                                    @if ($code = \Pterodactyl\Services\Dezerx\Overview\Overview::flagFor($node->location->short, $node->name))
                                        <img src="/dezerx/flags/{{ $code }}.svg" alt="" class="sa-flag" width="18" height="13" loading="lazy">
                                    @endif{{ $node->location->short }}
                                </td>
                                <td>{{ $node->memory }} MiB</td>
                                <td>{{ $node->disk }} MiB</td>
                                <td class="text-center">{{ $node->servers_count }}</td>
                                <td class="text-center" style="color:{{ ($node->scheme === 'https') ? '#50af51' : '#d9534f' }}"><i class="fa fa-{{ ($node->scheme === 'https') ? 'lock' : 'unlock' }}"></i></td>
                                <td class="text-center"><i class="fa fa-{{ ($node->public) ? 'eye' : 'eye-slash' }}"></i></td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            @if($nodes->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $nodes->appends(['query' => Request::input('query')])->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    <style>
        .sa-flag { width: 18px; height: 13px; margin-right: 7px; vertical-align: -1px; border-radius: 2px; object-fit: cover; box-shadow: 0 0 0 1px rgba(0, 0, 0, .12); }
        .nd-glance { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; margin-top: 3px; font-size: 12px; color: var(--sa-muted, #777); }
        .nd-dot { width: 7px; height: 7px; margin-right: -4px; border-radius: 50%; background: var(--sa-faint, #999); }
        .nd-dot.is-online { background: var(--sa-success, #50af51); box-shadow: 0 0 0 3px rgb(80 175 81 / .18); }
        .nd-dot.is-unreachable { background: var(--sa-danger, #d9534f); box-shadow: 0 0 0 3px rgb(217 83 79 / .18); }
        .nd-spark { overflow: visible; color: var(--sa-chart-1, var(--accent, #3c8dbc)); }
        .nd-spark polyline { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
        .nd-spark polygon { fill: currentColor; opacity: .14; }
    </style>
    <script>
    (function pingNodes() {
        $('td[data-action="ping"]').each(function(i, element) {
            $.ajax({
                type: 'GET',
                url: $(element).data('location'),
                headers: {
                    'Authorization': 'Bearer ' + $(element).data('secret'),
                },
                timeout: 5000
            }).done(function (data) {
                $(element).find('i').tooltip({
                    title: 'v' + data.version,
                });
                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heartbeat faa-pulse animated').css('color', '#50af51');
            }).fail(function (error) {
                var errorText = 'Error connecting to node! Check browser console for details.';
                try {
                    errorText = error.responseJSON.errors[0].detail || errorText;
                } catch (ex) {}

                $(element).removeClass('text-muted').find('i').removeClass().addClass('fa fa-fw fa-heart-o').css('color', '#d9534f');
                $(element).find('i').tooltip({ title: errorText });
            });
        }).promise().done(function () {
            setTimeout(pingNodes, 10000);
        });
    })();
    </script>
@endsection
