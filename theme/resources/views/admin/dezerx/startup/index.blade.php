@extends('layouts.admin')

@section('title')
    Startup Commands
@endsection

@section('content-header')
    <h1>Startup Commands<small>Ready made startup lines people can apply to their own server.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Startup Commands</li>
    </ol>
@endsection

@section('scripts')
    @parent
    <style>
        .dz-preset + .dz-preset { margin-top: 0; }
        .dz-preset textarea { font-family: monospace; font-size: 12px; }
        .dz-eggs { height: 190px; }
        .dz-eggs optgroup { color: var(--sa-muted, #9aa5b1); font-style: normal; }
        .dz-eggs option { color: var(--sa-ink, #cad1d8); padding: 3px 4px; }
        .dz-eggs option:checked { background-color: var(--sa-accent, #3c8dbc); box-shadow: inset 0 0 0 100px var(--sa-accent, #3c8dbc); color: var(--sa-on-accent, #fff); }
        .dz-hint { color: var(--sa-muted, #9aa5b1); }
        .dz-seed { margin-top: 12px; }
        .dz-seed .dz-hint { display: block; margin-top: 8px; }
    </style>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-12">
        <div class="box box-default">
            <div class="box-body">
                <p class="text-muted small">
                    Each command below appears in the <strong>Startup</strong> tab of every server whose egg it names,
                    as a card somebody can apply in one click. Nothing here changes a server on its own, and the
                    server has to restart before an applied command takes effect. What people may write themselves
                    is unchanged: this is the only way a server owner can change the command at all.
                </p>

                <form action="{{ route('admin.dezerx.startup.seed') }}" method="POST" class="dz-seed">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-sm btn-default">
                        <i class="fa fa-magic"></i> Add the ready made set
                    </button>
                    <span class="small dz-hint">
                        Five to start from: Aikar's flags in both sizes, the panel default, a crash diagnostics line
                        and the proxy flags. Each one arrives <strong>off</strong>, ticked for the eggs on this panel
                        that can take it. An egg that starts from an argument file, which is Forge, NeoForge and
                        newer Fabric, is left for you to tick knowingly. Pressing it twice adds nothing the second
                        time.
                    </span>
                </form>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-sm-12">
        <form action="{{ route('admin.dezerx.startup.store') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Add a command</h3></div>

                @include('admin.dezerx.startup.fields', ['preset' => null, 'nests' => $nests])

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-sm btn-primary pull-right">Add</button>
                </div>
            </div>
        </form>
    </div>
</div>

@foreach ($presets as $preset)
    <div class="row dz-preset">
        <div class="col-sm-12">
            <form action="{{ route('admin.dezerx.startup.update', ['preset' => $preset['id']]) }}" method="POST">
                <div class="box box-default">
                    <div class="box-header with-border">
                        <h3 class="box-title">
                            {{ $preset['label'] }}
                            @if (! $preset['enabled'])
                                <span class="label label-default">Off</span>
                            @endif
                            <span class="label label-primary">{{ count($preset['eggs']) }} {{ count($preset['eggs']) === 1 ? 'egg' : 'eggs' }}</span>
                        </h3>
                    </div>

                    @include('admin.dezerx.startup.fields', ['preset' => $preset, 'nests' => $nests])

                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-sm btn-primary pull-right">Save</button>
                        <button type="submit" class="btn btn-sm btn-danger"
                                formaction="{{ route('admin.dezerx.startup.destroy', ['preset' => $preset['id']]) }}">
                            Remove
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
@endforeach

@if (count($presets) === 0)
    <div class="row">
        <div class="col-sm-12">
            <div class="box box-default">
                <div class="box-body">
                    <p class="text-muted no-margin">Nothing yet. The form above adds the first one.</p>
                </div>
            </div>
        </div>
    </div>
@endif
@endsection
