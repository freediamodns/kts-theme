@extends('layouts.admin')

@section('title')
    Emails
@endsection

@section('content-header')
    <h1>Emails<small>What the panel says when it writes to somebody.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Emails</li>
    </ol>
@endsection

@section('scripts')
    @parent
    <link rel="stylesheet" href="/vendor/monaco/editor/editor.main.css">
    <style>
        .dz-list { list-style: none; margin: 0; padding: 6px; }
        .dz-list li { margin: 0; }

        .dz-list a {
            display: block;
            padding: 9px 12px;
            border: 0;
            border-radius: 4px;
            color: var(--sa-ink, #cad1d8);
            font-size: 13px;
            text-decoration: none;
            transition: background-color .15s ease, color .15s ease;
        }

        .dz-list a:hover, .dz-list a:focus { background-color: var(--sa-hover, rgba(255, 255, 255, .06)); color: var(--sa-strong, #fff); }
        .dz-list li.active > a { background-color: var(--sa-accent, #3c8dbc); color: var(--sa-on-accent, #fff); }

        .dz-vars { margin: 0; }
        .dz-vars div { display: flex; gap: 10px; align-items: baseline; padding: 5px 0; }
        .dz-vars code {
            flex: 0 0 auto;
            background-color: var(--sa-hover, rgba(255, 255, 255, .06));
            color: var(--sa-ink, #cad1d8);
            border: 0;
            font-size: 12px;
        }
        .dz-vars span { color: var(--sa-muted, #9aa5b1); font-size: 12px; }

        .dz-editor { height: 460px; width: 100%; border: 1px solid var(--sa-line, #0b0c0e); border-radius: 4px; overflow: hidden; }
        .dz-preview-frame {
            width: 100%;
            height: 620px;
            border: 0;
            border-radius: 4px;
            background-color: #f4f5f7;
            display: block;
        }
        .dz-preview-state { color: var(--sa-muted, #9aa5b1); font-size: 12px; }
        .dz-preview-state.is-bad { color: var(--sa-danger, #dd4b39); }
        .dz-mode { margin-bottom: 12px; }
        .dz-hint { color: var(--sa-muted, #9aa5b1); font-size: 12px; margin-top: 6px; }
    </style>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-3">
        <div class="box box-primary">
            <div class="box-header with-border"><h3 class="box-title">Layout</h3></div>

            <div class="box-body no-padding">
                <ul class="dz-list">
                    <li @if ($pane === 'layout') class="active" @endif>
                        <a href="{{ route('admin.dezerx.emails', ['template' => $selected, 'pane' => 'layout']) }}">
                            The frame round every message
                        </a>
                    </li>
                </ul>
            </div>

            <div class="box-footer">
                <span class="text-muted small">
                    @if ($layoutIsCustom)
                        Yours. <a href="#" onclick="document.getElementById('dz-layout-reset').submit(); return false;">Put the shipped one back</a>.
                    @else
                        The one this theme ships with.
                    @endif
                </span>
            </div>
        </div>

        <div class="box box-primary">
            <div class="box-header with-border"><h3 class="box-title">Messages</h3></div>

            <div class="box-body no-padding">
                <ul class="dz-list">
                    @foreach ($templates as $key => $entry)
                        <li @if ($key === $selected && $pane !== 'layout') class="active" @endif>
                            <a href="{{ route('admin.dezerx.emails', ['template' => $key]) }}">
                                {{ $entry['label'] }}@if ($entry['html'] !== '') <small class="text-muted">HTML</small>@endif
                            </a>
                        </li>
                    @endforeach
                </ul>
            </div>
        </div>

        <div class="box box-default">
            <div class="box-header with-border"><h3 class="box-title">Words you can drop in</h3></div>

            <div class="box-body">
                <p class="text-muted small">
                    Write these anywhere in the fields beside this, braces and all. Anything else in braces is left
                    exactly as it is typed.
                </p>

                <div class="dz-vars">
                    @if ($pane === 'layout')
                        @foreach ($layoutVariables as $name => $meaning)
                            <div>
                                <code>&#123;&#123; {{ $name }} &#125;&#125;</code>
                                <span>{{ $meaning }}</span>
                            </div>
                        @endforeach
                    @else
                        @foreach ($template['variables'] as $name => $meaning)
                            <div>
                                <code>&#123;&#123; {{ $name }} &#125;&#125;</code>
                                <span>{{ $meaning }}</span>
                            </div>
                        @endforeach

                        @foreach ($bodyVariables as $name => $meaning)
                            <div>
                                <code>&#123;&#123; {{ $name }} &#125;&#125;</code>
                                <span>{{ $meaning }} <em>(HTML only)</em></span>
                            </div>
                        @endforeach
                    @endif
                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-9">
        @if ($pane === 'layout')
            <form action="{{ route('admin.dezerx.emails.layout') }}" method="POST" id="dz-layout-form">
                <div class="box box-primary">
                    <div class="box-header with-border"><h3 class="box-title">The layout</h3></div>

                    <div class="box-body">
                        <p class="text-muted small">
                            The frame every message is drawn inside: the background, your logo, the card and the
                            footer. <code>&#123;&#123; content &#125;&#125;</code> is where the message itself goes,
                            so a layout without it would send empty mail and is refused.
                        </p>

                        <div class="dz-editor" id="dz-editor"></div>
                        <textarea name="layout" id="dz-field" class="hidden">{{ $layout }}</textarea>

                        <p class="dz-hint">
                            Plain HTML, not Blade. The braces above are the only thing swapped out, so nothing you
                            write here can run on the server.
                        </p>
                    </div>

                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-primary pull-right">Save the layout</button>
                    </div>
                </div>
            </form>

            <form action="{{ route('admin.dezerx.emails.layout.reset') }}" method="POST" id="dz-layout-reset"
                  onsubmit="return confirm('Put the shipped layout back? Anything you have written here is lost. The messages themselves are untouched.')">
                {!! csrf_field() !!}
            </form>
        @else
            <form action="{{ route('admin.dezerx.emails.update', ['template' => $selected]) }}" method="POST" id="dz-message-form">
                <div class="box box-primary">
                    <div class="box-header with-border">
                        <h3 class="box-title">{{ $template['label'] }}</h3>
                    </div>

                    <div class="box-body">
                        <p class="text-muted small">{{ $template['hint'] }}</p>

                        <div class="form-group">
                            <label class="control-label">Subject</label>
                            <input type="text" name="subject" class="form-control" maxlength="200"
                                   value="{{ old('subject', $template['subject']) }}" />
                            <p class="text-muted small">The line in their inbox. Never HTML, whichever way you write the rest.</p>
                        </div>
                        
                        <div class="dz-mode btn-group" role="group">
                            <button type="button" data-mode="simple"
                                    class="btn @if ($template['html'] === '') btn-primary @else btn-default @endif">
                                Wording
                            </button>
                            <button type="button" data-mode="html"
                                    class="btn @if ($template['html'] !== '') btn-primary @else btn-default @endif">
                                HTML
                            </button>
                        </div>

                        <input type="hidden" name="mode" id="dz-mode" value="{{ $template['html'] === '' ? 'simple' : 'html' }}" />

                        <div id="dz-simple" @if ($template['html'] !== '') style="display:none" @endif>
                            <div class="form-group">
                                <label class="control-label">Greeting</label>
                                <input type="text" name="greeting" class="form-control" maxlength="120"
                                       value="{{ old('greeting', $template['greeting']) }}" />
                                <p class="text-muted small">The line at the top of the card. Leave it empty for none.</p>
                            </div>

                            <div class="form-group">
                                <label class="control-label">Message</label>
                                <textarea name="body" class="form-control" rows="7" maxlength="2000">{{ old('body', $template['body']) }}</textarea>
                                <p class="text-muted small">
                                    A blank line starts a new paragraph. A single new line is a break inside one.
                                </p>
                            </div>

                            <div class="form-group">
                                <label class="control-label">Button</label>
                                <input type="text" name="action" class="form-control" maxlength="60"
                                       value="{{ old('action', $template['action']) }}" />
                                <p class="text-muted small">
                                    The words on the button. Where it goes is the panel's own, a reset link or a server
                                    address it generated, and cannot be set here. Leave this empty for a message with no
                                    button.
                                </p>
                            </div>

                            <div class="form-group">
                                <label class="control-label">After the button</label>
                                <textarea name="outro" class="form-control" rows="3" maxlength="400">{{ old('outro', $template['outro']) }}</textarea>
                                <p class="text-muted small">The last thing the message says. The place for "if this was not you".</p>
                            </div>
                        </div>

                        <div id="dz-html" @if ($template['html'] === '') style="display:none" @endif>
                            <div class="dz-editor" id="dz-editor"></div>
                            <textarea name="html" id="dz-field" class="hidden">{{ $template['html'] !== '' ? $template['html'] : $seed }}</textarea>

                            <p class="dz-hint">
                                What goes inside the card, so no <code>&lt;html&gt;</code> or <code>&lt;body&gt;</code>
                                here that is the layout's job. Switching back to Wording leaves this behind
                                and uses the fields above again.
                            </p>
                        </div>
                    </div>

                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-primary pull-right">Save</button>

                        <a href="{{ route('admin.dezerx.emails.preview', ['template' => $selected]) }}"
                           target="_blank" rel="noopener" class="btn btn-default">Open the saved one</a>
                    </div>
                </div>
            </form>
        @endif

        <div class="box box-default">
            <div class="box-header with-border">
                <h3 class="box-title">As it will arrive</h3>
                <div class="box-tools pull-right">
                    <span class="dz-preview-state" id="dz-preview-state"></span>
                </div>
            </div>

            <div class="box-body">
                <iframe id="dz-preview" class="dz-preview-frame" sandbox="" title="Preview"></iframe>
                <p class="dz-hint">
                    Drawn from what is on screen, saved or not, with your own name and address filled in.
                    @if ($pane === 'layout')
                        The message inside is <strong>{{ $template['label'] }}</strong>; pick another on the left to
                        frame that one instead.
                    @endif
                </p>
            </div>
        </div>

        <div class="row">
            <div class="col-sm-6">
                <div class="box box-default">
                    <div class="box-header with-border"><h3 class="box-title">Send yourself a copy</h3></div>

                    <div class="box-body">
                        <p class="text-muted small">
                            The <em>saved</em> message, drawn exactly as it will arrive, sent to the address on your own
                            account. It goes nowhere else. Save first if you have just been editing.
                        </p>
                    </div>

                    <div class="box-footer">
                        <form action="{{ route('admin.dezerx.emails.test', ['template' => $selected]) }}" method="POST">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-default">Send a test</button>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-sm-6">
                <div class="box box-default">
                    <div class="box-header with-border"><h3 class="box-title">Start again</h3></div>

                    <div class="box-body">
                        <p class="text-muted small">
                            Puts this one message back to the wording the theme ships with, HTML and all. Nothing else
                            is touched.
                        </p>
                    </div>

                    <div class="box-footer">
                        <form action="{{ route('admin.dezerx.emails.reset', ['template' => $selected]) }}" method="POST"
                              onsubmit="return confirm('Put {{ $template['label'] }} back to what the theme ships with?')">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-default">Reset this message</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent
    
    <script src="/vendor/monaco/loader.js"></script>

    @php($dzSaved = [
        'subject' => $template['subject'],
        'greeting' => $template['greeting'],
        'body' => $template['body'],
        'action' => $template['action'],
        'outro' => $template['outro'],
        'html' => $template['html'],
    ])

    <script>
        (function () {
            var state = {
                pane: @json($pane),
                template: @json($selected),
                draftUrl: @json(route('admin.dezerx.emails.draft')),
                token: @json(csrf_token()),
                saved: @json($dzSaved),
            };

            var field = document.getElementById('dz-field');
            var host = document.getElementById('dz-editor');
            var frame = document.getElementById('dz-preview');
            var status = document.getElementById('dz-preview-state');
            var editor = null;
            var timer = null;
            var inFlight = null;

            function mode() {
                var node = document.getElementById('dz-mode');

                return node ? node.value : 'simple';
            }

            function value(name) {
                var node = document.querySelector('[name="' + name + '"]');

                return node ? node.value : '';
            }

            function payload() {
                var body = new URLSearchParams();

                body.set('template', state.template);

                if (state.pane === 'layout') {
                    body.set('mode', state.saved.html === '' ? 'simple' : 'html');
                    body.set('subject', state.saved.subject);
                    body.set('greeting', state.saved.greeting);
                    body.set('body', state.saved.body);
                    body.set('action', state.saved.action);
                    body.set('outro', state.saved.outro);
                    body.set('html', state.saved.html);
                    body.set('layout', editor ? editor.getValue() : '');
                } else {
                    body.set('mode', mode());
                    body.set('subject', value('subject'));
                    body.set('greeting', value('greeting'));
                    body.set('body', value('body'));
                    body.set('action', value('action'));
                    body.set('outro', value('outro'));
                    body.set('html', editor ? editor.getValue() : '');
                    body.set('layout', '');
                }

                return body;
            }

            function refresh() {
                if (inFlight) {
                    inFlight.abort();
                }

                inFlight = new AbortController();
                status.textContent = 'Drawing…';
                status.className = 'dz-preview-state';

                fetch(state.draftUrl, {
                    method: 'POST',
                    credentials: 'same-origin',
                    signal: inFlight.signal,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-CSRF-TOKEN': state.token,
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: payload().toString(),
                })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('The panel answered ' + response.status + '.');
                        }

                        return response.text();
                    })
                    .then(function (html) {
                        frame.srcdoc = html;
                        status.textContent = '';
                    })
                    .catch(function (error) {
                        if (error.name === 'AbortError') {
                            return;
                        }

                        status.textContent = 'Could not draw that: ' + error.message;
                        status.className = 'dz-preview-state is-bad';
                    });
            }

            function soon() {
                window.clearTimeout(timer);
                timer = window.setTimeout(refresh, 400);
            }

            function toggle() {
                var html = mode() === 'html';
                var simpleBlock = document.getElementById('dz-simple');
                var htmlBlock = document.getElementById('dz-html');

                if (simpleBlock) {
                    simpleBlock.style.display = html ? 'none' : '';
                }

                if (htmlBlock) {
                    htmlBlock.style.display = html ? '' : 'none';
                }

                if (html && editor) {
                    editor.layout();
                }

                soon();
            }

            ['subject', 'greeting', 'body', 'action', 'outro'].forEach(function (name) {
                var node = document.querySelector('[name="' + name + '"]');

                if (node) {
                    node.addEventListener('input', soon);
                }
            });

            Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (button) {
                button.addEventListener('click', function () {
                    var picked = button.getAttribute('data-mode');
                    var modeField = document.getElementById('dz-mode');

                    if (!modeField || modeField.value === picked) {
                        return;
                    }

                    modeField.value = picked;

                    Array.prototype.forEach.call(document.querySelectorAll('[data-mode]'), function (other) {
                        var on = other.getAttribute('data-mode') === picked;

                        other.className = 'btn ' + (on ? 'btn-primary' : 'btn-default');
                    });

                    toggle();
                });
            });

            ['dz-layout-form', 'dz-message-form'].forEach(function (id) {
                var form = document.getElementById(id);

                if (form) {
                    form.addEventListener('submit', function () {
                        if (editor && field) {
                            field.value = editor.getValue();
                        }
                    });
                }
            });

            function plainBox(why) {
                if (field) {
                    field.className = 'form-control';
                    field.rows = 20;
                    field.addEventListener('input', soon);
                }

                if (host) {
                    host.style.display = 'none';
                }

                status.textContent = why;
                status.className = 'dz-preview-state is-bad';
                refresh();
            }

            if (!host || !field) {
                refresh();

                return;
            }

            if (typeof require === 'undefined' || typeof require.config !== 'function') {
                plainBox('The code editor could not load, so this is a plain box.');

                return;
            }

            require.config({ paths: { vs: '/vendor/monaco' } });

            require(['vs/editor/editor.main'], function () {
                editor = monaco.editor.create(host, {
                    value: field.value,
                    language: 'html',
                    theme: 'vs-dark',
                    automaticLayout: true,
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    tabSize: 2,
                    scrollBeyondLastLine: false,
                    fontSize: 13,
                    renderWhitespace: 'selection',
                });

                editor.onDidChangeModelContent(soon);
                refresh();
            }, function () {
                plainBox('The code editor could not load, so this is a plain box.');
            });
        })();
    </script>
@endsection
