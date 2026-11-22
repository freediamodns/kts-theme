@extends('layouts.admin')

@section('title')
    Support Staff
@endsection

@section('scripts')
    @parent
    <style>
        .dz-switch {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0 0 10px;
            padding: 12px 14px;
            border: 1px solid var(--sa-line, #e4e7ea);
            border-radius: 6px;
            background: var(--sa-well, #fbfcfd);
            cursor: pointer;
            font-weight: 400;
            transition: border-color .15s ease, background-color .15s ease;
        }

        .dz-switch:hover { border-color: var(--sa-line-strong, #c9d2d9); background: var(--sa-hover, #f6f8fa); }

        .dz-switch input { position: absolute; opacity: 0; width: 0; height: 0; }

        .dz-switch-track {
            position: relative;
            flex: 0 0 auto;
            width: 42px;
            height: 24px;
            border-radius: 999px;
            background: var(--sa-field-edge, #cdd5db);
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

        .dz-switch input:checked + .dz-switch-track { background: var(--sa-accent, #3c8dbc); }
        .dz-switch input:checked + .dz-switch-track::after { transform: translateX(18px); }
        .dz-switch input:focus-visible + .dz-switch-track { box-shadow: 0 0 0 3px var(--sa-ring, rgba(60, 141, 188, .35)); }

        .dz-switch-text { line-height: 1.35; }
        .dz-switch-text strong { display: block; }
        .dz-switch-text small { color: var(--sa-muted, #8a949c); }

        .dz-perms { column-count: 2; column-gap: 18px; }
        .dz-perms label { display: block; font-weight: 400; margin-bottom: 4px; }
        .dz-perms code { font-size: 11px; }
        .dz-figure { font-size: 22px; font-weight: 600; line-height: 1.1; }
        .dz-roster td { vertical-align: middle !important; }
        .dz-roster .form-control { height: 28px; padding: 2px 8px; font-size: 12px; }
    </style>
@endsection

@section('content-header')
    <h1>Support Staff<small>Letting somebody you trust into a server for a while.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Support Staff</li>
    </ol>
@endsection

@section('content')
@php
    $value = function (string $key) use ($settings, $defaults) {
        return $settings[$key] ?? $defaults[$key] ?? '';
    };
    $on = function (string $key) use ($settings, $defaults) {
        return (bool) ($settings[$key] ?? $defaults[$key] ?? false);
    };
    $eventOn = function (string $event) use ($settings, $defaults) {
        $stored = $settings['webhook_events'] ?? null;

        if (is_array($stored) && array_key_exists($event, $stored)) {
            return (bool) $stored[$event];
        }

        return (bool) ($defaults['webhook_events'][$event] ?? false);
    };
    $eventLabels = [
        'opened' => 'A request is opened',
        'claimed' => 'Somebody takes a request on',
        'granted' => 'Access starts',
        'resigned' => 'A session is handed back',
        'declined' => 'A request is declined or called off',
        'resolved' => 'A session finishes',
        'expiring' => 'A session is about to run out',
        'expired' => 'A session runs out',
        'message' => 'Somebody writes in a session, with what they wrote',
    ];
@endphp

<form action="{{ route('admin.dezerx.staff.update') }}" method="POST">
    <div class="row">
        <div class="col-sm-7">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">The system</h3></div>

                <div class="box-body">
                    <label class="dz-switch">
                        <input type="checkbox" name="enabled" value="1" @if ($enabled) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Turn the support staff system on</strong>
                            <small>{{ $enabled ? 'On, owners can ask for help and staff can answer.' : 'Off, the tab and the endpoints do not exist.' }}</small>
                        </span>
                    </label>
                    <p class="text-muted small">
                        Off, the Support tab disappears, the staff dashboard disappears, every endpoint answers with a
                        404 and the sweep stops running. Sessions that are already open are left alone so nobody loses
                        access in the middle of something. Use the button on the right to end those too.
                    </p>

                    <label class="dz-switch">
                        <input type="checkbox" name="allow_queue" value="1" @if ($on('allow_queue')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let owners ask the queue</strong>
                            <small>A request nobody is named on, that any staff member can pick up.</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="allow_named" value="1" @if ($on('allow_named')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let owners ask for somebody by username</strong>
                            <small>Only that person sees the request, and only they can take it on.</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="allow_staff_requests" value="1" @if ($on('allow_staff_requests')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Let staff ask an owner for access</strong>
                            <small>The other direction: staff ask, the owner decides.</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="allow_open_ended" value="1" @if ($on('allow_open_ended')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Allow sessions with no time limit</strong>
                            <small>For as long as the work takes, ended by hand.</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="auto_accept_default" value="1" @if ($on('auto_accept_default')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Accept automatically, by default</strong>
                            <small>{{ $on('auto_accept_default') ? 'A request is granted the moment somebody takes it on.' : 'The owner confirms the person who took it on.' }}</small>
                        </span>
                    </label>
                    <p class="text-muted small">
                        This is only the default. Every owner can set their own preference from the Support tab, and it
                        governs both directions: whether a claim on their request lets somebody straight in, and
                        whether a staff member asking for access is allowed in without them clicking anything.
                    </p>

                    <label class="dz-switch">
                        <input type="checkbox" name="require_2fa" value="1" @if ($on('require_2fa')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Require two factor authentication of staff</strong>
                            <small>A staff account without it cannot take anything on.</small>
                        </span>
                    </label>

                    <label class="dz-switch">
                        <input type="checkbox" name="notify_email" value="1" @if ($on('notify_email')) checked @endif />
                        <span class="dz-switch-track"></span>
                        <span class="dz-switch-text">
                            <strong>Send emails</strong>
                            <small>Both sides get told when something happens. The wording is under Emails.</small>
                        </span>
                    </label>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Time</h3></div>

                <div class="box-body">
                    <div class="row">
                        <div class="col-sm-6 form-group">
                            <label class="control-label">Default length, minutes</label>
                            <input type="number" name="default_duration_minutes" class="form-control" min="5" max="43200" value="{{ $value('default_duration_minutes') }}" />
                            <p class="text-muted small">What the Support tab offers first.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Longest a session may be, minutes</label>
                            <input type="number" name="max_duration_minutes" class="form-control" min="5" max="43200" value="{{ $value('max_duration_minutes') }}" />
                            <p class="text-muted small">Anything longer is cut down to this. 1440 is a day.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Drop a request nobody takes after, minutes</label>
                            <input type="number" name="queue_ttl_minutes" class="form-control" min="0" max="43200" value="{{ $value('queue_ttl_minutes') }}" />
                            <p class="text-muted small">0 leaves requests waiting for ever.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Warn this long before the end, minutes</label>
                            <input type="number" name="reminder_minutes" class="form-control" min="0" max="240" value="{{ $value('reminder_minutes') }}" />
                            <p class="text-muted small">0 sends no warning. The countdown turns amber at the same point.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Extensions a session may have</label>
                            <input type="number" name="max_extensions" class="form-control" min="0" max="20" value="{{ $value('max_extensions') }}" />
                            <p class="text-muted small">0 means no extensions at all.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Longest single extension, minutes</label>
                            <input type="number" name="extension_max_minutes" class="form-control" min="5" max="43200" value="{{ $value('extension_max_minutes') }}" />
                        </div>
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Limits</h3></div>

                <div class="box-body">
                    <div class="row">
                        <div class="col-sm-6 form-group">
                            <label class="control-label">Staff on one server at once</label>
                            <input type="number" name="max_staff_per_server" class="form-control" min="1" max="10" value="{{ $value('max_staff_per_server') }}" />
                            <p class="text-muted small">
                                How many seats a server has. Each open request holds a seat, so this is also how many
                                requests one server can have waiting.
                            </p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Servers one staff member may hold at once</label>
                            <input type="number" name="max_active_per_staff" class="form-control" min="0" max="50" value="{{ $value('max_active_per_staff') }}" />
                            <p class="text-muted small">0 lifts the limit. Each staff member can also be given a lower one of their own below.</p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Accounts that may hold the staff role</label>
                            <input type="number" name="max_staff_accounts" class="form-control" min="0" max="500" value="{{ $value('max_staff_accounts') }}" />
                            <p class="text-muted small">
                                0 lifts the limit. {{ $panel['staff'] }} in use right now. Promoting somebody past this
                                is refused on their account page.
                            </p>
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Wait between requests on one server, minutes</label>
                            <input type="number" name="cooldown_minutes" class="form-control" min="0" max="1440" value="{{ $value('cooldown_minutes') }}" />
                        </div>

                        <div class="col-sm-6 form-group">
                            <label class="control-label">Shortest reason, characters</label>
                            <input type="number" name="reason_min_length" class="form-control" min="0" max="200" value="{{ $value('reason_min_length') }}" />
                            <p class="text-muted small">
                                Nobody gets access without the owner saying what it is for. This is how much they have
                                to write.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">What a session can be given</h3></div>

                <div class="box-body">
                    <p class="text-muted small">
                        The owner picks one of these three when they ask for help, and can untick anything inside it
                        before they send the request. Whatever is ticked here is only ever an upper bound: a session is
                        also cut down to what the owner themselves holds, and these four are never grantable at all, so
                        a support session can never manage other people's access or reinstall a server:
                        @foreach ($never as $permission)<code>{{ $permission }}</code>@if (!$loop->last), @endif @endforeach.
                    </p>

                    @foreach ($labels as $scope => $label)
                        <div class="form-group">
                            <label class="control-label">{{ $label }}</label>
                            <p class="text-muted small">{{ $hints[$scope] }}</p>

                            <div class="dz-perms">
                                @foreach ($grantable as $group => $permissions)
                                    @foreach ($permissions as $permission)
                                        <label>
                                            <input type="checkbox" name="presets[{{ $scope }}][]" value="{{ $permission }}"
                                                   @if (in_array($permission, $presets[$scope] ?? [], true)) checked @endif />
                                            <code>{{ $permission }}</code>
                                        </label>
                                    @endforeach
                                @endforeach
                            </div>
                        </div>
                    @endforeach
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save settings</button>
                </div>
            </div>
        </div>

        <div class="col-sm-5">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Discord</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Webhook address</label>
                        <input type="text" name="webhook_url" class="form-control"
                               placeholder="{{ $webhook ? 'A webhook is saved, type to replace it' : 'https://discord.com/api/webhooks/…' }}" />
                        <p class="text-muted small">
                            Where the notices go. Only an https Discord webhook is accepted, it is stored encrypted,
                            and the panel never follows a redirect from it. Leave this blank to keep the one you have.
                        </p>
                        @if ($webhook)
                            <label class="dz-switch">
                                <input type="checkbox" name="webhook_clear" value="1" />
                                <span class="dz-switch-track"></span>
                                <span class="dz-switch-text">
                                    <strong>Forget the saved webhook</strong>
                                    <small>Nothing will be posted to Discord after this.</small>
                                </span>
                            </label>
                        @endif
                    </div>

                    <div class="form-group">
                        <label class="control-label">Role to mention</label>
                        <input type="text" name="webhook_role_id" class="form-control" value="{{ $value('webhook_role_id') }}" placeholder="000000000000000000" />
                        <p class="text-muted small">
                            The role id pinged when a request opens or is handed back. Blank pings nobody. Nothing else
                            in a notice can mention anybody, whatever an owner writes in their reason.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Post about</label>
                        @foreach ($events as $event)
                            <label style="display:block;font-weight:400;">
                                <input type="checkbox" name="webhook_events[{{ $event }}]" value="1" @if ($eventOn($event)) checked @endif />
                                {{ $eventLabels[$event] ?? $event }}
                            </label>
                        @endforeach
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Right now</h3></div>

                <div class="box-body">
                    <div class="row">
                        <div class="col-xs-4">
                            <div class="dz-figure">{{ $panel['waiting'] }}</div>
                            <small class="text-muted">waiting</small>
                        </div>
                        <div class="col-xs-4">
                            <div class="dz-figure">{{ $panel['active'] }}</div>
                            <small class="text-muted">in a server</small>
                        </div>
                        <div class="col-xs-4">
                            <div class="dz-figure">{{ $panel['staff'] }}</div>
                            <small class="text-muted">staff accounts</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<div class="row">
    <div class="col-sm-5 col-sm-offset-7">
        <form action="{{ route('admin.dezerx.staff.end') }}" method="POST">
            <div class="box box-danger">
                <div class="box-header with-border"><h3 class="box-title">End everything</h3></div>

                <div class="box-body">
                    <p class="text-muted small">
                        Ends every open request and takes back every session now. Access is removed, SFTP keys are
                        revoked and both sides are told. Nothing else about the system changes.
                    </p>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-danger pull-right">End every session</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">The staff</h3>
                <p class="text-muted small" style="margin: 6px 0 0;">
                    The role itself is granted on somebody's account page, under Users. This is what each of them has
                    done and the details the system needs.
                </p>
            </div>

            <div class="box-body table-responsive no-padding">
                <table class="table table-hover dz-roster">
                    <tr>
                        <th>Username</th>
                        <th>Taken on</th>
                        <th>Servers</th>
                        <th>Finished</th>
                        <th>Handed back</th>
                        <th>Declined</th>
                        <th>Time</th>
                        <th>Now</th>
                        <th>Last seen</th>
                        <th style="min-width: 320px;">Details</th>
                    </tr>

                    @foreach ($roster as $person)
                        <tr>
                            <td>{{ $person['username'] }}</td>
                            <td>{{ $person['taken'] }}</td>
                            <td>{{ $person['servers'] }}</td>
                            <td>{{ $person['resolved'] }}</td>
                            <td>{{ $person['handedBack'] }}</td>
                            <td>{{ $person['declined'] }}</td>
                            <td>{{ $person['minutes'] }}m</td>
                            <td>{{ $person['active'] }}</td>
                            <td>{{ $person['lastActive'] ? \Carbon\Carbon::parse($person['lastActive'])->diffForHumans() : 'never' }}</td>
                            <td>
                                <form action="{{ route('admin.dezerx.staff.profile', $person['id']) }}" method="POST" class="form-inline">
                                    {!! csrf_field() !!}
                                    <label style="font-weight:400;margin-right:8px;">
                                        <input type="checkbox" name="available" value="1" @if ($person['available']) checked @endif /> available
                                    </label>
                                    <input type="text" name="discord_id" class="form-control" style="width:150px;"
                                           value="{{ $person['discord'] }}" placeholder="discord id" />
                                    <input type="number" name="max_active" class="form-control" style="width:70px;"
                                           min="1" max="50" value="{{ max(1, (int) $person['maxActive']) }}" title="servers at once" />
                                    <button type="submit" class="btn btn-xs btn-primary">Save</button>
                                </form>
                            </td>
                        </tr>
                    @endforeach

                    @if (count($roster) === 0)
                        <tr>
                            <td colspan="10" class="text-muted">
                                Nobody is support staff yet. Open somebody's account under Users and set Support staff
                                to yes.
                            </td>
                        </tr>
                    @endif
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
