@extends('layouts.admin')

@section('title')
    AI Companion
@endsection

@section('scripts')
    @parent
    <style>
        .dz-switch {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 0;
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

        .dz-switch input:focus-visible + .dz-switch-track {
            box-shadow: 0 0 0 3px var(--sa-ring, rgba(60, 141, 188, .35));
        }

        .dz-switch-text { line-height: 1.35; }
        .dz-switch-text strong { display: block; }
        .dz-switch-text small { color: var(--sa-muted, #8a949c); }

        .dz-switch + .text-muted { margin-top: 8px; }
    </style>
@endsection

@section('content-header')
    <h1>AI Companion<small>The assistant in the corner of everybody's panel.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">AI Companion</li>
    </ol>
@endsection

@section('content')
<form action="{{ route('admin.dezerx.ai.update') }}" method="POST">
    <div class="row">
        <div class="col-sm-7">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">The service</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="dz-switch">
                            <input type="checkbox" name="enabled" value="1" @if ($enabled) checked @endif />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Turn the assistant on</strong>
                                <small>{{ $enabled ? 'On, the widget is in everybody\'s corner.' : 'Off, nothing is rendered and nothing is sent.' }}</small>
                            </span>
                        </label>
                        <p class="text-muted small">
                            Off, the widget does not exist: nothing is rendered, no endpoint answers, and no request
                            leaves this panel. It stays off until a key is saved below, because an assistant with
                            nothing to ask is a button that apologises.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Service</label>
                        <select name="provider" class="form-control">
                            @foreach ($providers as $key => $label)
                                <option value="{{ $key }}" @if ($provider === $key) selected @endif>
                                    {{ $label }}@if ($defaultModels[$key] ?? '') &nbsp; {{ $defaultModels[$key] }}@endif
                                </option>
                            @endforeach
                        </select>
                        <p class="text-muted small">
                            Everything except Claude speaks OpenAI's chat-completions shape, Gemini included through
                            Google's compatibility endpoint, so the choice here is which address this panel posts to,
                            not which code path runs.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Model</label>
                        <input type="text" name="model" class="form-control" value="{{ $model }}"
                               placeholder="{{ $defaultModels[$provider] ?: 'whatever the service defaults to' }}" />
                        <p class="text-muted small">
                            Leave this blank for the service's own default. A model name belongs to the service chosen
                            above: pointing at another service and keeping this name is how you get a 404 that reads
                            like a broken panel.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Address</label>
                        <input type="text" name="base_url" class="form-control" value="{{ $baseUrl }}"
                               placeholder="https://…" />
                        <p class="text-muted small">
                            Only read for <code>custom</code> and for Ollama when it is not on this machine. This is
                            where an API key gets posted, so only <code>http://</code> and <code>https://</code> are
                            accepted, and plain http only because a local runner on this host is a normal way to use
                            this.
                        </p>
                    </div>
                </div>
            </div>

            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">What it is told it is</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <textarea name="system" class="form-control" rows="10"
                                  placeholder="{{ $defaultPrompt }}">{{ $system }}</textarea>
                        <p class="text-muted small">
                            The introduction, in front of every question. Blank uses the one shipped with the theme,
                            shown here as the placeholder. This is about <em>what the assistant is</em>, how it should
                            spend a turn, and the fact that it must not survey a whole server to answer one question,
                            is added separately and is not editable, because it holds whatever is written here.
                        </p>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save settings</button>
                </div>
            </div>
        </div>

        <div class="col-sm-5">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Who pays</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Keys</label>
                        <select name="key_mode" class="form-control">
                            <option value="panel" @if ($keyMode === 'panel') selected @endif>
                                Panel, one key, set here, spent by everybody
                            </option>
                            <option value="user" @if ($keyMode === 'user') selected @endif>
                                Own, everybody brings their own or goes without
                            </option>
                            <option value="choice" @if ($keyMode === 'choice') selected @endif>
                                Either, the panel's key, and anybody may use their own instead
                            </option>
                        </select>
                        <p class="text-muted small">
                            On <strong>panel</strong>, every question anybody asks is billed to the key below. The
                            allowance underneath is the only thing between that key and a busy afternoon.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="dz-switch">
                            <input type="checkbox" name="allow_writes" value="1" @if ($allowWrites) checked @endif />
                            <span class="dz-switch-track"></span>
                            <span class="dz-switch-text">
                                <strong>Let it change things</strong>
                                <small>{{ $allowWrites ? 'It can write files, send commands and restart servers.' : 'Read-only, it advises, people act.' }}</small>
                            </span>
                        </label>
                        <p class="text-muted small">
                            Off, the assistant can read logs, files, settings and schedules but cannot write a file,
                            send a command or restart anything, it says what should change and leaves it to the
                            person. The write tools are not merely refused, they are not offered: a model handed a tool
                            it may never use spends steps finding that out.
                        </p>
                        <p class="text-muted small">
                            On, it still cannot do anything the person asking could not do themselves. Every call is
                            checked against that account's own permission on that server, exactly as the panel's own
                            forms are, and each person decides separately whether it asks before acting.
                        </p>
                    </div>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Questions each</label>
                            <input type="number" name="limit_messages" class="form-control" min="1" max="120"
                                   value="{{ $limit['messages'] }}" />
                        </div>
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Per minutes</label>
                            <input type="number" name="limit_minutes" class="form-control" min="1" max="1440"
                                   value="{{ $limit['minutes'] }}" />
                        </div>
                    </div>
                    <p class="text-muted small">
                        A ceiling rather than a throttle on abuse: every question spends real money and holds a PHP
                        worker for as long as it runs. The widget shows people what they have left, read off this
                        same counter, so nobody types a question out only to be turned away by it.
                    </p>

                    <div class="row">
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Steps per question</label>
                            <input type="number" name="max_steps" class="form-control" min="1" max="30"
                                   value="{{ $maxSteps }}" />
                            <p class="text-muted small">Trips round the tool loop. Each is one request to the model.</p>
                        </div>
                        <div class="col-xs-6 form-group">
                            <label class="control-label">Seconds per question</label>
                            <input type="number" name="time_budget" class="form-control" min="30" max="600"
                                   value="{{ $timeBudget }}" />
                            <p class="text-muted small">
                                It answers with what it has when this runs out. Keep it under your PHP-FPM and nginx
                                timeouts, the answer streams out of one request.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</form>

<div class="row">
    <div class="col-xs-12">
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">API keys</h3>
                <div class="box-tools">
                    <a href="{{ route('admin.dezerx.ai.test') }}" class="btn btn-sm btn-default">
                        Test {{ $provider }}
                    </a>
                </div>
            </div>

            <div class="box-body">
                <p class="text-muted small">
                    One key per service, so switching between two does not mean typing a key back in each time. Keys
                    are encrypted with this panel's <code>APP_KEY</code> before they are stored and are never shown
                    again, replace one by typing a new one, remove one by saving an empty box. Rotating
                    <code>APP_KEY</code> makes every key here unreadable, which the panel treats as no key rather than
                    as an error.
                </p>

                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th style="width:22%">Service</th>
                            <th>Key</th>
                            <th style="width:12%"></th>
                        </tr>

                        @foreach ($providers as $key => $label)
                            <tr>
                                <form action="{{ route('admin.dezerx.ai.key') }}" method="POST">
                                    <td>
                                        {{ $label }}
                                        @if ($provider === $key)
                                            <span class="label label-primary">in use</span>
                                        @endif
                                        @if (in_array($key, $keyless, true))
                                            <span class="label label-default">no key needed</span>
                                        @endif
                                    </td>
                                    <td>
                                        <input type="hidden" name="provider" value="{{ $key }}" />
                                        <input type="password" name="key" class="form-control input-sm"
                                               autocomplete="new-password"
                                               placeholder="{{ $keys[$key] ? 'A key is set, type to replace it, or save empty to remove it' : 'Not set' }}" />
                                    </td>
                                    <td class="text-right">
                                        {!! csrf_field() !!}
                                        <button type="submit" class="btn btn-xs btn-primary">Save</button>
                                    </td>
                                </form>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>

            <div class="box-footer">
                <p class="text-muted small" style="margin:0">
                    Where the widget sits, bottom right, bottom left, or nowhere at all, is in the theme editor,
                    under <strong>Motion and chrome</strong>, because it is a look rather than a capability.
                </p>
            </div>
        </div>
    </div>
</div>
@endsection
