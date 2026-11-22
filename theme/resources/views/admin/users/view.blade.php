@extends('layouts.admin')

@section('title')
    Manage User: {{ $user->username }}
@endsection

@section('content-header')
    <h1>{{ $user->name_first }} {{ $user->name_last}}<small>{{ $user->username }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.users') }}">Users</a></li>
        <li class="active">{{ $user->username }}</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <form action="{{ route('admin.users.view', $user->id) }}" method="post">
        <div class="col-md-6">
            <div class="box box-primary">
                <div class="box-header with-border">
                    <h3 class="box-title">Identity</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="email" class="control-label">Email</label>
                        <div>
                            <input type="email" name="email" value="{{ $user->email }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Username</label>
                        <div>
                            <input type="text" name="username" value="{{ $user->username }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Client First Name</label>
                        <div>
                            <input type="text" name="name_first" value="{{ $user->name_first }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="registered" class="control-label">Client Last Name</label>
                        <div>
                            <input type="text" name="name_last" value="{{ $user->name_last }}" class="form-control form-autocomplete-stop">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="control-label">Default Language</label>
                        <div>
                            <select name="language" class="form-control">
                                @foreach($languages as $key => $value)
                                    <option value="{{ $key }}" @if($user->language === $key) selected @endif>{{ $value }}</option>
                                @endforeach
                            </select>
                            <p class="text-muted"><small>The default language to use when rendering the Panel for this user.</small></p>
                        </div>
                    </div>
                </div>
                <div class="box-footer">
                    {!! csrf_field() !!}
                    {!! method_field('PATCH') !!}
                    <input type="submit" value="Update User" class="btn btn-primary btn-sm">
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Password</h3>
                </div>
                <div class="box-body">
                    <div class="alert alert-success" style="display:none;margin-bottom:10px;" id="gen_pass"></div>
                    <div class="form-group no-margin-bottom">
                        <label for="password" class="control-label">Password <span class="field-optional"></span></label>
                        <div>
                            <input type="password" id="password" name="password" class="form-control form-autocomplete-stop">
                            <p class="text-muted small">Leave blank to keep this user's password the same. User will not receive any notification if password is changed.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-6">
            <div class="box">
                <div class="box-header with-border">
                    <h3 class="box-title">Permissions</h3>
                </div>
                <div class="box-body">
                    <div class="form-group">
                        <label for="root_admin" class="control-label">Administrator</label>
                        <div>
                            <select name="root_admin" class="form-control">
                                <option value="0">@lang('strings.no')</option>
                                <option value="1" {{ $user->root_admin ? 'selected="selected"' : '' }}>@lang('strings.yes')</option>
                            </select>
                            <p class="text-muted"><small>Setting this to 'Yes' gives a user full administrative access.</small></p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="staff" class="control-label">Support staff</label>
                        <div>
                            <select name="staff" class="form-control">
                                <option value="0">@lang('strings.no')</option>
                                <option value="1" {{ $user->staff ? 'selected="selected"' : '' }}>@lang('strings.yes')</option>
                            </select>
                            <p class="text-muted"><small>
                                Lets this account answer support requests: it sees the queue, can be asked for by
                                username, and can ask a server owner for access. It grants no access to anything on its
                                own. Every session is time limited, recorded in the server's activity log and endable by
                                the owner at any point. What the role is allowed to be handed is set under
                                <a href="{{ route('admin.dezerx.staff') }}">Support Staff</a>.
                            </small></p>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="demo" class="control-label">Demo account</label>
                        <div>
                            <select name="demo" class="form-control">
                                <option value="0">@lang('strings.no')</option>
                                <option value="1" {{ $user->demo ? 'selected="selected"' : '' }}>@lang('strings.yes')</option>
                            </select>
                            <p class="text-muted"><small>
                                Prints this account's username and password on the sign-in screen for anyone to use, and
                                stops it changing anything at all: no power actions, no files, no backups, no eggs, no
                                Docker image, no email, password, two-factor or SSH key. It can open the live theme
                                editor and try every control in it, but only in its own browser.
                                <strong>Only one account can be the demo.</strong> Turning this on takes it off
                                whoever had it. It also removes administrator rights and any two-factor on this account.
                                A password typed above replaces the public one.
                            </small></p>
                        </div>
                    </div>
                    @if($user->demo)
                        <div class="callout callout-warning" style="margin-bottom:0">
                            <h4 style="margin-top:0">These credentials are public</h4>
                            <p class="no-margin">
                                The sign-in screen shows
                                <strong>{{ $user->username }}</strong>
                                @if($demoPassword !== null)
                                    / <strong><code>{{ $demoPassword }}</code></strong>
                                @endif
                                to everyone who loads it.
                                @if($demoPassword === null)
                                    No password is on file, so nothing is shown yet. Set one above and save.
                                @endif
                            </p>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </form>
    @php
        $freeCreate = \Pterodactyl\Services\Dezerx\ServerCreate\ServerCreate::allowanceFor($user);

        $rows = [
            'servers' => ['Servers', ''],
            'memory' => ['Memory', 'MiB'],
            'disk' => ['Disk', 'MiB'],
            'cpu' => ['Processor', '%'],
            'databases' => ['Databases', ''],
            'allocations' => ['Extra ports', ''],
            'backups' => ['Backups', ''],
        ];

        $write = fn (int $figure, string $unit) => number_format($figure) . ($unit === '' ? '' : ' ' . $unit);
    @endphp

    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Free servers</h3>
            </div>

            <form action="{{ route('admin.users.servercreate', $user->id) }}" method="POST">
                {!! csrf_field() !!}

                <div class="box-body">
                    <p class="text-muted small">
                        What this account has to spend on servers it builds for itself. Building one takes its size
                        out of the total and deleting it hands the whole lot back, so a person with 4096 MiB who
                        builds a server of 3072 has 1024 left for the next one. Only servers this feature handed out
                        are counted: anything an administrator built for them by hand costs them nothing, and nothing
                        typed here ever changes a server that already exists.
                    </p>

                    <table class="table table-condensed">
                        <tr>
                            <th></th>
                            <th style="width: 16%">Using</th>
                            <th style="width: 16%">Total</th>
                            <th style="width: 16%">Left</th>
                            <th style="width: 24%">Give this account its own total</th>
                        </tr>

                        @foreach ($rows as $key => $row)
                            @php($stand = $freeCreate[$key])
                            <tr>
                                <td>{{ $row[0] }}</td>
                                <td>{{ $write($stand['used'], $row[1]) }}</td>
                                <td>
                                    @if ($stand['total'] === null)
                                        <span class="text-muted">Not counted</span>
                                    @else
                                        {{ $write($stand['total'], $row[1]) }}
                                    @endif
                                </td>
                                <td class="{{ $stand['left'] === 0 ? 'text-danger' : '' }}">
                                    @if ($stand['left'] === null)
                                        <span class="text-muted">-</span>
                                    @else
                                        {{ $write($stand['left'], $row[1]) }}
                                    @endif
                                </td>
                                <td>
                                    <input type="number" class="form-control input-sm" min="0"
                                           name="own[{{ $key }}]"
                                           value="{{ $stand['own'] === 0 ? '' : $stand['own'] }}" />
                                </td>
                            </tr>
                        @endforeach
                    </table>

                    <p class="text-muted small no-margin">
                        An empty box holds this account to what every account gets, which is set under
                        <a href="{{ route('admin.dezerx.servercreate') }}">Server Create</a>. Type a figure to give
                        this one more, or less, than the rest. <strong>Not counted</strong> means the panel has put no
                        total on that resource at all, so it is not being spent or tracked for anybody.
                    </p>
                </div>

                <div class="box-footer">
                    <button type="submit" class="btn btn-sm btn-primary pull-right">Save what they may spend</button>
                </div>
            </form>
        </div>
    </div>

    <div class="col-xs-12">
        <div class="box box-danger">
            <div class="box-header with-border">
                <h3 class="box-title">Delete User</h3>
            </div>
            <div class="box-body">
                <p class="no-margin">There must be no servers associated with this account in order for it to be deleted.</p>
            </div>
            <div class="box-footer">
                <form action="{{ route('admin.users.view', $user->id) }}" method="POST">
                    {!! csrf_field() !!}
                    {!! method_field('DELETE') !!}
                    <input id="delete" type="submit" class="btn btn-sm btn-danger pull-right" {{ $user->servers->count() < 1 ?: 'disabled' }} value="Delete User" />
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
