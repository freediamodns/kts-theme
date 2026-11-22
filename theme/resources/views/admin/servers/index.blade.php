@extends('layouts.admin')

@section('title')
    List Servers
@endsection

@php
    $filter = (array) request()->query('filter', []);
    $search = is_string($filter['*'] ?? null) ? $filter['*'] : '';
    $nodeId = (int) ($filter['node_id'] ?? 0);
    $eggId = (int) ($filter['egg_id'] ?? 0);
    $status = is_string($filter['status'] ?? null) ? $filter['status'] : '';
    $sort = is_string(request()->query('sort')) ? request()->query('sort') : '';
    $filtered = $search !== '' || $nodeId > 0 || $eggId > 0 || $status !== '' || $owner !== null;
    $total = $servers->total();
@endphp

@section('content-header')
    <h1>Servers<small>All servers available on the system.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Servers</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary sv-box">
            <div class="box-header with-border sv-head">
                <h3 class="box-title">Server List <span class="sv-total">{{ $total }}</span></h3>
                <a href="{{ route('admin.servers.new') }}" class="btn btn-sm btn-primary"><i class="fa fa-plus"></i> Create New</a>
            </div>

            <form action="{{ route('admin.servers') }}" method="GET" class="sv-filters" id="sv-filters">
                <div class="sv-search">
                    <i class="fa fa-search" aria-hidden="true"></i>
                    <input type="text" name="filter[*]" class="form-control" value="{{ $search }}"
                           placeholder="Name, id or owner" aria-label="Search servers">
                </div>

                <select name="filter[owner_id]" class="form-control sv-owner" aria-label="Owner" data-placeholder="Any owner">
                    <option value=""></option>
                    @if ($owner)
                        <option value="{{ $owner->id }}" selected>{{ $owner->username }} ({{ $owner->email }})</option>
                    @endif
                </select>

                <select name="filter[node_id]" class="form-control sv-auto" aria-label="Node">
                    <option value="">Any node</option>
                    @foreach ($nodes as $node)
                        <option value="{{ $node->id }}" @if ($nodeId === $node->id) selected @endif>{{ $node->name }}</option>
                    @endforeach
                </select>

                <select name="filter[egg_id]" class="form-control sv-auto" aria-label="Egg">
                    <option value="">Any egg</option>
                    @foreach ($nests as $nest)
                        <optgroup label="{{ $nest->name }}">
                            @foreach ($nest->eggs as $egg)
                                <option value="{{ $egg->id }}" @if ($eggId === $egg->id) selected @endif>{{ $egg->name }}</option>
                            @endforeach
                        </optgroup>
                    @endforeach
                </select>

                <select name="filter[status]" class="form-control sv-auto" aria-label="Status">
                    <option value="">Any status</option>
                    @foreach ($statuses as $key => $meta)
                        <option value="{{ $key }}" @if ($status === $key) selected @endif>{{ $meta['label'] }}</option>
                    @endforeach
                </select>

                <select name="sort" class="form-control sv-auto" aria-label="Order">
                    <option value="">Oldest first</option>
                    @foreach ($sorts as $key => $label)
                        @if ($key !== 'created')
                            <option value="{{ $key }}" @if ($sort === $key) selected @endif>{{ $label }}</option>
                        @endif
                    @endforeach
                </select>

                <div class="sv-filter-actions">
                    <button type="submit" class="btn btn-sm btn-default"><i class="fa fa-filter"></i> Filter</button>
                    @if ($filtered)
                        <a href="{{ route('admin.servers') }}" class="btn btn-sm btn-link">Clear</a>
                    @endif
                </div>
            </form>

            <form action="{{ route('admin.servers.bulk') }}" method="POST" class="sv-bulk" id="sv-bulk" hidden>
                {!! csrf_field() !!}
                <input type="hidden" name="action" value="">
                <input type="hidden" name="confirm" value="">
                <input type="hidden" name="return" value="">

                <span class="sv-bulk-count"><strong data-sv-count>0</strong> selected</span>

                <div class="sv-bulk-actions">
                    <button type="button" class="btn btn-sm btn-default" data-sv-action="suspend"><i class="fa fa-pause"></i> Suspend</button>
                    <button type="button" class="btn btn-sm btn-default" data-sv-action="unsuspend"><i class="fa fa-play"></i> Unsuspend</button>
                    <button type="button" class="btn btn-sm btn-default" data-sv-action="reinstall"><i class="fa fa-refresh"></i> Reinstall</button>
                    <div class="btn-group">
                        <button type="button" class="btn btn-sm btn-danger" data-sv-action="delete"><i class="fa fa-trash"></i> Delete</button>
                        <button type="button" class="btn btn-sm btn-danger dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" aria-label="More delete options">
                            <span class="caret"></span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-right">
                            <li><a href="#" data-sv-action="force-delete">Force delete, even if a node does not answer</a></li>
                        </ul>
                    </div>
                    <button type="button" class="btn btn-sm btn-link" data-sv-clear>Clear selection</button>
                </div>
            </form>

            <div class="box-body table-responsive no-padding">
                <table class="table table-hover sv-table">
                    <thead>
                        <tr>
                            <th class="sv-check">
                                <input type="checkbox" class="sv-pick-all" aria-label="Select every server on this page" @if ($total === 0) disabled @endif>
                            </th>
                            <th>Server</th>
                            <th>ID</th>
                            <th>Owner</th>
                            <th>Node</th>
                            <th>Connection</th>
                            <th class="text-center">Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($servers as $server)
                            @php
                                $egg = $server->egg;
                                $state = match (true) {
                                    $server->isSuspended() => ['Suspended', 'bg-maroon'],
                                    in_array($server->status, ['install_failed', 'reinstall_failed'], true) => ['Install failed', 'label-danger'],
                                    $server->status === 'installing' => ['Installing', 'label-warning'],
                                    $server->status === 'restoring_backup' => ['Restoring', 'label-info'],
                                    default => ['Active', 'label-success'],
                                };
                            @endphp
                            <tr data-server="{{ $server->uuidShort }}">
                                <td class="sv-check">
                                    <input type="checkbox" class="sv-pick" name="servers[]" value="{{ $server->id }}" form="sv-bulk"
                                           aria-label="Select {{ $server->name }}">
                                </td>
                                <td>
                                    <div class="sv-name">
                                        <img src="{{ \Pterodactyl\Services\Dezerx\Allocations\EggArtwork::logo($egg?->uuid, $egg?->name) }}"
                                             alt="" class="sv-icon" loading="lazy" width="34" height="34">
                                        <div class="sv-name-text">
                                            <a href="{{ route('admin.servers.view', $server->id) }}">{{ $server->name }}</a>
                                            <span class="sv-sub">{{ $egg?->name ?? 'No egg' }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td><code title="{{ $server->uuid }}">{{ $server->uuidShort }}</code></td>
                                <td><a href="{{ route('admin.users.view', $server->user->id) }}">{{ $server->user->username }}</a></td>
                                <td><a href="{{ route('admin.nodes.view', $server->node->id) }}">{{ $server->node->name }}</a></td>
                                <td>
                                    <code>{{ $server->allocation->alias }}:{{ $server->allocation->port }}</code>
                                </td>
                                <td class="text-center">
                                    <span class="label {{ $state[1] }}">{{ $state[0] }}</span>
                                </td>
                                <td class="text-center">
                                    <a class="btn btn-xs btn-default" href="/server/{{ $server->uuidShort }}" title="Open in the panel"><i class="fa fa-wrench"></i></a>
                                </td>
                            </tr>
                        @endforeach

                        @if ($total === 0)
                            <tr class="sv-empty">
                                <td colspan="8">{{ $filtered ? 'No server matches these filters.' : 'There are no servers yet.' }}</td>
                            </tr>
                        @endif
                    </tbody>
                </table>
            </div>
            @if($servers->hasPages())
                <div class="box-footer with-border">
                    <div class="col-md-12 text-center">{!! $servers->render() !!}</div>
                </div>
            @endif
        </div>
    </div>
</div>
@endsection

@section('scripts')
    @parent
    <style>
        .sv-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .sv-head::before, .sv-head::after { display: none; }
        .sv-total {
            display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 600;
            vertical-align: 2px; background: var(--sa-well, #1f2933); color: var(--sa-muted, #9aa5b1);
        }

        .sv-filters {
            display: grid; gap: 8px; align-items: center; padding: 12px 15px;
            grid-template-columns: minmax(200px, 2fr) repeat(5, minmax(130px, 1fr)) auto;
            border-bottom: 1px solid var(--sa-line, #4d5b69);
        }
        @media (max-width: 1399px) { .sv-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } .sv-search { grid-column: span 2; } }
        @media (max-width: 767px) { .sv-filters { grid-template-columns: minmax(0, 1fr); } .sv-search { grid-column: auto; } }
        .sv-filters .form-control { height: 34px; }
        .sv-search { position: relative; }
        .sv-search .fa { position: absolute; top: 50%; left: 11px; transform: translateY(-50%); color: var(--sa-faint, #6f7c89); pointer-events: none; }
        .sv-search .form-control { padding-left: 32px; }
        .sv-filter-actions { display: flex; align-items: center; gap: 4px; white-space: nowrap; }

        .sv-bulk {
            display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 15px;
            border-bottom: 1px solid var(--sa-line, #4d5b69); background: var(--sa-tint, rgba(9, 103, 211, .12));
        }
        .sv-bulk[hidden] { display: none; }
        .sv-bulk-count { color: var(--sa-ink, #cad1d8); }
        .sv-bulk-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-left: auto; }

        .sv-table { margin: 0; }
        .sv-table > thead > tr > th { font-size: 12px; font-weight: 600; color: var(--sa-muted, #9aa5b1); white-space: nowrap; }
        .sv-table > tbody > tr > td { vertical-align: middle !important; }
        .sv-table > tbody > tr.is-picked { background: var(--sa-hover, rgba(202, 209, 216, .06)); }
        .sv-check { width: 1px; padding-left: 15px !important; padding-right: 4px !important; }
        .sv-check input { margin: 0; vertical-align: middle; }
        .sv-name { display: flex; align-items: center; gap: 11px; min-width: 200px; }
        .sv-icon {
            flex: none; width: 34px; height: 34px; object-fit: cover; border-radius: var(--sa-r-sm, 6px);
            background: var(--sa-well, #1f2933); box-shadow: 0 0 0 1px var(--sa-line, rgba(0, 0, 0, .2));
        }
        .sv-name-text { min-width: 0; line-height: 1.3; }
        .sv-name-text a { font-weight: 600; }
        .sv-sub { display: block; font-size: 12px; color: var(--sa-muted, #9aa5b1); }
        .sv-empty td { padding: 32px 15px !important; text-align: center; color: var(--sa-muted, #9aa5b1); }
    </style>
@endsection

@section('footer-scripts')
    @parent
    <script>
        (function () {
            var filters = document.getElementById('sv-filters');
            var bulk = document.getElementById('sv-bulk');
            var boxes = Array.prototype.slice.call(document.querySelectorAll('.sv-pick'));
            var all = document.querySelector('.sv-pick-all');
            var count = bulk.querySelector('[data-sv-count]');
            var last = null;

            function tidy() {
                Array.prototype.forEach.call(filters.elements, function (field) {
                    if (field.name && field.value === '') {
                        field.disabled = true;
                    }
                });
            }

            function apply() {
                tidy();
                filters.submit();
            }

            filters.addEventListener('submit', tidy);
            $(filters).find('.sv-auto').select2({ width: '100%', minimumResultsForSearch: 10 }).on('change', apply);

            $(filters).find('.sv-owner').select2({
                width: '100%',
                allowClear: true,
                placeholder: 'Any owner',
                minimumInputLength: 2,
                ajax: {
                    url: '/admin/users/accounts.json',
                    dataType: 'json',
                    delay: 250,
                    data: function (params) {
                        return { filter: { email: params.term } };
                    },
                    processResults: function (data) {
                        return {
                            results: (data || []).map(function (user) {
                                return { id: user.id, text: user.username + ' (' + user.email + ')' };
                            }),
                        };
                    },
                },
            }).on('change', apply);

            function picked() {
                return boxes.filter(function (box) {
                    return box.checked;
                });
            }

            function paint() {
                var n = picked().length;

                boxes.forEach(function (box) {
                    box.closest('tr').classList.toggle('is-picked', box.checked);
                });

                count.textContent = n;
                bulk.hidden = n === 0;
                all.checked = n > 0 && n === boxes.length;
                all.indeterminate = n > 0 && n < boxes.length;
            }

            all.addEventListener('change', function () {
                boxes.forEach(function (box) {
                    box.checked = all.checked;
                });
                paint();
            });

            boxes.forEach(function (box, index) {
                box.addEventListener('click', function (event) {
                    if (event.shiftKey && last !== null) {
                        var from = Math.min(last, index);
                        var to = Math.max(last, index);

                        for (var i = from; i <= to; i++) {
                            boxes[i].checked = box.checked;
                        }
                    }

                    last = index;
                    paint();
                });
            });

            bulk.querySelector('[data-sv-clear]').addEventListener('click', function () {
                boxes.forEach(function (box) {
                    box.checked = false;
                });
                paint();
            });

            function send(action, confirm) {
                bulk.elements.action.value = action;
                bulk.elements.confirm.value = confirm || '';
                bulk.elements.return.value = window.location.search;
                bulk.submit();
            }

            var WORDING = {
                suspend: ['Suspend', 'They stop at once and their owners cannot start them until they are unsuspended.'],
                unsuspend: ['Unsuspend', 'Their owners can start them again.'],
                reinstall: ['Reinstall', 'Each one runs its egg\'s install script again. Files the script replaces are overwritten.'],
            };

            $(bulk).on('click', '[data-sv-action]', function (event) {
                event.preventDefault();

                var action = this.getAttribute('data-sv-action');
                var n = picked().length;
                var noun = n === 1 ? '1 server' : n + ' servers';

                if (action === 'delete' || action === 'force-delete') {
                    swal({
                        type: 'input',
                        title: (action === 'force-delete' ? 'Force delete ' : 'Delete ') + noun + '?',
                        text: 'Their files, databases and backups go with them, and this cannot be undone. Type DELETE to go ahead.',
                        inputPlaceholder: 'DELETE',
                        showCancelButton: true,
                        closeOnConfirm: false,
                        confirmButtonText: 'Delete',
                        confirmButtonColor: '#d9534f',
                    }, function (value) {
                        if (value === false) {
                            return false;
                        }

                        if (value !== 'DELETE') {
                            swal.showInputError('Type DELETE, in capitals, to go ahead.');

                            return false;
                        }

                        send(action, value);
                    });

                    return;
                }

                swal({
                    type: 'warning',
                    title: WORDING[action][0] + ' ' + noun + '?',
                    text: WORDING[action][1],
                    showCancelButton: true,
                    closeOnConfirm: false,
                    confirmButtonText: WORDING[action][0],
                }, function () {
                    send(action);
                });
            });

            paint();
        })();
    </script>
@endsection
