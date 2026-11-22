@extends('layouts.admin')

@section('title')
    Application API
@endsection

@section('content-header')
    <h1>Application API<small>Control access credentials for managing this Panel via the API.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Application API</li>
    </ol>
@endsection

@section('content')
    <div class="row">
        <div class="col-xs-12">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Credentials List</h3>
                    <div class="box-tools">
                        <a href="{{ route('admin.api.new') }}" class="btn btn-sm btn-primary">Create New</a>
                    </div>
                </div>
                <div class="box-body table-responsive no-padding">
                    <table class="table table-hover">
                        <tr>
                            <th>Key</th>
                            <th>Memo</th>
                            <th>Last Used</th>
                            <th>Created</th>
                            <th>Created by</th>
                            <th></th>
                        </tr>
                        @foreach($keys as $key)
                            <tr>
                                <td>
                                    
                                    <span class="sa-secret">
                                        @if (Auth::user()->is($key->user))
                                            <code class="sa-secret-value" aria-label="API key, hidden">{{ $key->identifier . decrypt($key->token) }}</code>
                                            <button type="button" class="btn btn-xs btn-default sa-secret-copy" data-action="copy-key" title="Copy key" aria-label="Copy key">
                                                <i class="fa fa-fw fa-clone"></i>
                                            </button>
                                        @else
                                            <code class="sa-secret-value" aria-label="API key, hidden">{{ $key->identifier . '****' }}</code>
                                        @endif
                                    </span>
                                </td>
                                <td>{{ $key->memo }}</td>
                                <td>
                                    @if(!is_null($key->last_used_at))
                                        @datetimeHuman($key->last_used_at)
                                    @else
                                        -
                                    @endif
                                </td>
                                <td>@datetimeHuman($key->created_at)</td>
                                <td>
                                    <a href="{{ route('admin.users.view', $key->user->id) }}">{{ $key->user->username }}</a>
                                </td>
                                <td>
                                    <a href="#" data-action="revoke-key" data-attr="{{ $key->identifier }}">
                                        <i class="fa fa-trash-o text-danger"></i>
                                    </a>
                                </td>
                            </tr>
                        @endforeach
                    </table>
                </div>
            </div>
        </div>
    </div>
@endsection

@section('footer-scripts')
    @parent
    <style>
        .sa-secret { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; }
        .sa-secret-value {
            filter: blur(5px); user-select: none; -webkit-user-select: none; pointer-events: none;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sa-secret-copy { flex: none; }
        @media print { .sa-secret-value { visibility: hidden; } }
    </style>
    <script>
        $(document).ready(function() {
            $('[data-action="copy-key"]').click(function (event) {
                event.preventDefault();
                var button = $(this);
                var key = button.siblings('.sa-secret-value').text().trim();
                var done = function (ok) {
                    var icon = button.find('i');
                    icon.attr('class', ok ? 'fa fa-fw fa-check text-success' : 'fa fa-fw fa-times text-danger');
                    button.attr('title', ok ? 'Copied' : 'Could not copy');
                    setTimeout(function () {
                        icon.attr('class', 'fa fa-fw fa-clone');
                        button.attr('title', 'Copy key');
                    }, 1500);
                };
                var fallback = function () {
                    var area = $('<textarea readonly>').val(key).css({ position: 'fixed', top: 0, left: 0, opacity: 0 }).appendTo('body');
                    area[0].select();
                    var ok = false;
                    try { ok = document.execCommand('copy'); } catch (e) {}
                    area.remove();
                    done(ok);
                };
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(key).then(function () { done(true); }, fallback);
                } else {
                    fallback();
                }
            });

            $('[data-action="revoke-key"]').click(function (event) {
                var self = $(this);
                event.preventDefault();
                swal({
                    type: 'error',
                    title: 'Revoke API Key',
                    text: 'Once this API key is revoked any applications currently using it will stop working.',
                    showCancelButton: true,
                    allowOutsideClick: true,
                    closeOnConfirm: false,
                    confirmButtonText: 'Revoke',
                    confirmButtonColor: '#d9534f',
                    showLoaderOnConfirm: true
                }, function () {
                    $.ajax({
                        method: 'DELETE',
                        url: '/admin/api/revoke/' + self.data('attr'),
                        headers: {
                            'X-CSRF-TOKEN': '{{ csrf_token() }}'
                        }
                    }).done(function () {
                        swal({
                            type: 'success',
                            title: '',
                            text: 'API Key has been revoked.'
                        });
                        self.parent().parent().slideUp();
                    }).fail(function (jqXHR) {
                        console.error(jqXHR);
                        swal({
                            type: 'error',
                            title: 'Whoops!',
                            text: 'An error occurred while attempting to revoke this key.'
                        });
                    });
                });
            });
        });
    </script>
@endsection
