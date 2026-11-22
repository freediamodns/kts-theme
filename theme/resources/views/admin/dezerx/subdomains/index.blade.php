@extends('layouts.admin')

@section('title')
    Subdomains
@endsection

@section('content-header')
    <h1>Subdomains<small>Names people can claim for their servers.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Subdomains</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-6">
        <form action="{{ route('admin.dezerx.subdomains.settings') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Cloudflare</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">API token</label>
                        <input type="password" name="cloudflare_token" class="form-control" autocomplete="new-password"
                               placeholder="{{ $hasToken ? 'A token is set, type to replace it' : 'Not set' }}" />
                        <p class="text-muted small">
                            A <strong>scoped</strong> token with <code>Zone · DNS · Edit</code> on the zones below, not
                            the account's global key: the global key can do anything the account can, including billing,
                            and cannot be narrowed or revoked without changing everything else that uses it.
                            Leave this blank to keep the token you have.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Names per server</label>
                        <input type="number" name="max_per_server" class="form-control" min="0" max="25"
                               value="{{ $maxPerServer }}" />
                        <p class="text-muted small">
                            How many names one server may hold at a time. <code>0</code> stops anybody claiming a new
                            one without releasing what is already claimed.
                        </p>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save</button>

                    @if ($hasToken)
                        <a href="{{ route('admin.dezerx.subdomains.verify') }}" class="btn btn-default">Test token</a>
                    @endif
                </div>
            </div>
        </form>

        @if ($hasToken)
            <form action="{{ route('admin.dezerx.subdomains.token.clear') }}" method="POST"
                  onsubmit="return confirm('Remove the Cloudflare token? The Subdomains tab disappears until another is set. Names already claimed keep working, and their DNS records are untouched.')">
                {!! csrf_field() !!}
                <button type="submit" class="btn btn-link text-red">Remove the stored token</button>
            </form>
        @endif
    </div>

    <div class="col-sm-6">
        <form action="{{ route('admin.dezerx.subdomains.domains.store') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Offer a domain</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Domain</label>
                        <input type="text" name="domain" class="form-control" placeholder="example.com" required />
                        <p class="text-muted small">The zone itself, as Cloudflare knows it. People claim names under it.</p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Record type</label>
                        <select name="record_type" class="form-control">
                            <option value="SRV">SRV: the port is carried, so players type the name alone</option>
                            <option value="CNAME">CNAME: players type name:port</option>
                        </select>
                    </div>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Protocol</label>
                            <input type="text" name="protocol" class="form-control" value="_minecraft" />
                            <p class="text-muted small">SRV only.</p>
                        </div>
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Transport</label>
                            <select name="transport" class="form-control">
                                <option value="tcp">tcp</option>
                                <option value="udp">udp</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Eggs</label>
                        <select name="eggs[]" class="form-control" multiple size="8">
                            @foreach ($nests as $nest)
                                <optgroup label="{{ $nest->name }}">
                                    @foreach ($nest->eggs as $egg)
                                        <option value="{{ $egg->id }}">{{ $egg->name }}</option>
                                    @endforeach
                                </optgroup>
                            @endforeach
                        </select>
                        <p class="text-muted small">
                            Which servers may claim a name here, by the egg they run. Pick nothing and the domain is
                            offered on every egg. Servers running anything else are never shown it.
                        </p>
                    </div>

                    <div class="checkbox">
                        <label><input type="checkbox" name="enabled" value="1" checked /> Offer this domain now</label>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-success pull-right">Add domain</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">Domains</h3></div>

{{-- 122283 --}}

            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>Domain</th>
                            <th>Record</th>
                            <th>Zone</th>
                            <th>Eggs</th>
                            <th class="text-center">Offered</th>
                            <th></th>
                        </tr>

                        @forelse ($domains as $domain)
                            @php($chosenEggs = array_map('intval', (array) json_decode((string) ($domain->eggs ?? ''), true)))

                            <tr>
                                <form action="{{ route('admin.dezerx.subdomains.domains.update', $domain->id) }}" method="POST">
                                    <td><input type="text" name="domain" class="form-control input-sm" value="{{ $domain->domain }}" /></td>
                                    <td>
                                        <select name="record_type" class="form-control input-sm">
                                            <option value="SRV" @if ($domain->record_type === 'SRV') selected @endif>SRV</option>
                                            <option value="CNAME" @if ($domain->record_type === 'CNAME') selected @endif>CNAME</option>
                                        </select>
                                        <input type="text" name="protocol" class="form-control input-sm" value="{{ $domain->protocol }}" />
                                        <select name="transport" class="form-control input-sm">
                                            <option value="tcp" @if ($domain->transport === 'tcp') selected @endif>tcp</option>
                                            <option value="udp" @if ($domain->transport === 'udp') selected @endif>udp</option>
                                        </select>
                                    </td>
                                    <td>
                                        @if ($domain->zone_id)
                                            <code>{{ substr($domain->zone_id, 0, 12) }}…</code>
                                        @else
                                            <span class="label label-warning">Not resolved</span>
                                        @endif
                                    </td>
                                    <td style="min-width:220px">
                                        <select name="eggs[]" class="form-control input-sm" multiple size="5">
                                            @foreach ($nests as $nest)
                                                <optgroup label="{{ $nest->name }}">
                                                    @foreach ($nest->eggs as $egg)
                                                        <option value="{{ $egg->id }}" @if (in_array($egg->id, $chosenEggs, true)) selected @endif>{{ $egg->name }}</option>
                                                    @endforeach
                                                </optgroup>
                                            @endforeach
                                        </select>
                                        <p class="text-muted small">
                                            @if ($chosenEggs === [])
                                                Offered on every egg.
                                            @else
                                                Offered on {{ count($chosenEggs) }} {{ count($chosenEggs) === 1 ? 'egg' : 'eggs' }}. Deselect them all to offer it on every egg.
                                            @endif
                                        </p>
                                    </td>
                                    <td class="text-center">
                                        <input type="checkbox" name="enabled" value="1" @if ($domain->enabled) checked @endif />
                                    </td>
                                    <td class="text-right">
                                        {!! csrf_field() !!}
                                        <button type="submit" class="btn btn-xs btn-primary">Save</button>
                                </form>
                                        <form action="{{ route('admin.dezerx.subdomains.domains.destroy', $domain->id) }}" method="POST" style="display:inline"
                                              onsubmit="return confirm('Remove {{ $domain->domain }}? Names claimed under it are forgotten here, but their DNS records stay at Cloudflare, so delete those yourself if you want them gone.')">
                                            {!! method_field('DELETE') !!}
                                            {!! csrf_field() !!}
                                            <button type="submit" class="btn btn-xs btn-danger">Remove</button>
                                        </form>
                                    </td>
                            </tr>
                        @empty
                            <tr><td colspan="6" class="text-muted text-center">No domains yet. The Subdomains tab stays hidden until there is at least one offered.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">Claimed names</h3>
            </div>

            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Points at</th>
                            <th>Server</th>
                            <th>Claimed by</th>
                            <th>When</th>
                            <th></th>
                        </tr>

                        @forelse ($records as $record)
                            <tr>
                                <td><code>{{ $record->subdomain }}.{{ $record->domain ?? '?' }}</code></td>
                                <td>{{ $record->record_type }}</td>
                                <td>{{ $record->target }}@if ($record->port):{{ $record->port }}@endif</td>
                                <td>
                                    @if ($record->server_short)
                                        <a href="/server/{{ $record->server_short }}">{{ $record->server_name }}</a>
                                    @else
                                        <span class="text-muted">gone</span>
                                    @endif
                                </td>
                                <td>{{ $record->email ?? '-' }}</td>
                                <td>{{ $record->created_at }}</td>
                                <td class="text-right">
                                    <form action="{{ route('admin.dezerx.subdomains.records.destroy', $record->id) }}" method="POST"
                                          onsubmit="return confirm('Release {{ $record->subdomain }}.{{ $record->domain ?? '' }}? This deletes its DNS records at Cloudflare and frees the name.')">
                                        {!! method_field('DELETE') !!}
                                        {!! csrf_field() !!}
                                        <button type="submit" class="btn btn-xs btn-danger">Release</button>
                                    </form>
                                </td>
                            </tr>
                        @empty
                            <tr><td colspan="7" class="text-muted text-center">Nobody has claimed a name yet.</td></tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
