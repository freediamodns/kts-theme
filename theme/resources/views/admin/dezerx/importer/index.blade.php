@extends('layouts.admin')

@section('title')
    Server Importer
@endsection

@section('content-header')
    <h1>Server Importer<small>Where imports may reach, and how much they may carry.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Server Importer</li>
    </ol>
@endsection

@section('scripts')
    @parent
    <style>
        .dz-hint { color: var(--sa-muted, #9aa5b1); }
        .dz-switch { font-weight: normal; }
        .dz-hosts td { padding: 4px 8px; }
    </style>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-12">
        <div class="box box-default">
            <div class="box-body">
                <p class="text-muted small no-margin">
                    Customers save their own profiles in the <strong>Import</strong> tab of any server the addon is
                    ticked for: a <strong>server</strong> holds a host, a port and whether it speaks SFTP or FTP, and a
                    <strong>credential</strong> holds a username and password. Both are theirs alone, encrypted with
                    this panel's <code>APP_KEY</code>, visible only to the account that saved them and never shown to
                    anybody else including you. This page decides what those imports are allowed to do.
                </p>
                <p class="text-muted small" style="margin-top: 8px; margin-bottom: 0;">
                    An import connects from <em>this panel</em> to the host named, reads the folder chosen and writes
                    the files onto the customer's server through its node, so it costs the panel bandwidth for
                    everything carried. It runs on the queue, so <code>php artisan queue:work</code> has to be running
                    or nothing will move.
                </p>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-sm-8">
        <form action="{{ route('admin.dezerx.importer.update') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">What imports may do</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Hosts imports may reach</label>
                        <textarea name="hosts" class="form-control" rows="4" maxlength="4000"
                                  placeholder="oldhost.com&#10;node12.example.net">{{ implode("\n", $policy['hosts']) }}</textarea>
                        <p class="small dz-hint">
                            One per line. A bare domain allows everything under it, so <code>oldhost.com</code> covers
                            <code>node12.oldhost.com</code>. <strong>Leave empty to allow any public host</strong>,
                            which lets a customer point this panel at any address it can reach.
                        </p>
                    </div>

                    <div class="row">
                        <div class="col-sm-6 form-group">
                            <label class="control-label">Most files in one import</label>
                            <input type="number" name="maxFiles" class="form-control" min="0" max="1000000"
                                   value="{{ $policy['maxFiles'] }}" placeholder="50000">
                            <p class="small dz-hint">
                                0 means no limit. Every file costs one request to the node, so a huge source is slow
                                rather than impossible.
                            </p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Most megabytes in one import</label>
                            <input type="number" name="maxMegabytes" class="form-control" min="0" max="10000000"
                                   value="{{ $policy['maxMegabytes'] }}" placeholder="0">
                            <p class="small dz-hint">
                                0 uses the destination server's own disk limit, which is usually what you want.
                            </p>
                        </div>
                    </div>

                    <div class="form-group">
                        <input type="hidden" name="allowPrivate" value="0">
                        <label class="dz-switch">
                            <input type="checkbox" name="allowPrivate" value="1" @if ($policy['allowPrivate']) checked @endif>
                            Allow private and loopback addresses
                        </label>
                        <p class="small dz-hint">
                            Off by default. An import to <code>127.0.0.1</code> or <code>10.0.0.0/8</code> reaches
                            whatever sits beside the panel, so turn this on only if the hosts your customers import
                            from are genuinely on the same private network.
                        </p>
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Traffic</h3></div>

                <div class="box-body">
                    <div class="row">
                        <div class="col-sm-4 form-group">
                            <label class="control-label">Imports running at once</label>
                            <input type="number" name="maxConcurrent" class="form-control" min="0" max="1000"
                                   value="{{ $policy['maxConcurrent'] }}" placeholder="3">
                            <p class="small dz-hint">
                                Across every server on the panel. 0 means no limit. Anything queued beyond this waits
                                its turn rather than running at once.
                            </p>
                        </div>

                        <div class="col-sm-4 form-group">
                            <label class="control-label">Imports per account per day</label>
                            <input type="number" name="maxPerDay" class="form-control" min="0" max="1000"
                                   value="{{ $policy['maxPerDay'] }}" placeholder="3">
                            <p class="small dz-hint">
                                0 means no limit. Resets at midnight, server time.
                            </p>
                        </div>

                        <div class="col-sm-4 form-group">
                            <label class="control-label">Starts per minute, per account</label>
                            <input type="number" name="startPerMinute" class="form-control" min="1" max="1000"
                                   value="{{ $policy['startPerMinute'] }}" placeholder="2">
                            <p class="small dz-hint">
                                How many times an account may press "Start the import" in a minute before the panel
                                makes it wait.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-sm btn-primary pull-right">Save limits</button>
                </div>
            </div>
        </form>
    </div>

    <div class="col-sm-4">
        <div class="box box-default">
            <div class="box-header with-border"><h3 class="box-title">Saved profiles</h3></div>

            <div class="box-body">
                <p class="text-muted small">
                    {{ $saved }} {{ $saved === 1 ? 'server' : 'servers' }} and
                    {{ $credentials }} {{ $credentials === 1 ? 'credential' : 'credentials' }} saved by
                    {{ $people }} {{ $people === 1 ? 'person' : 'people' }}. Each account may keep
                    {{ $maxPerUser }} of each. The credentials themselves are encrypted and are not readable from here.
                </p>

                @if (count($hosts) > 0)
                    <table class="table table-condensed dz-hosts">
                        <tbody>
                            @foreach ($hosts as $host)
                                <tr>
                                    <td>{{ $host->host }}</td>
                                    <td class="text-right text-muted">{{ $host->total }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                    <p class="small dz-hint no-margin">
                        The hosts being imported from most, which is where to start if you are filling the allowlist in.
                    </p>
                @else
                    <p class="text-muted small no-margin">Nobody has saved a profile yet.</p>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
