@extends('layouts.admin')

@section('title')
    {{ $meta['name'] }}
@endsection

@section('content-header')
    <h1>{{ $meta['name'] }}@if ($meta['beta'] ?? false) <span title="New: there may still be rough edges." style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;vertical-align:4px;background:var(--sa-warn-bg,#c77c02);color:var(--sa-warn-ink,#fff)">Beta</span>@endif<small>{{ $scoped ? 'Which servers this addon shows up on.' : 'How this addon behaves across the panel.' }}</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.dezerx.addons') }}">KTS Host Addons</a></li>
        <li class="active">{{ $meta['name'] }}</li>
    </ol>
@endsection

@section('content')

@php($legacy = isset($eggRules))
<form method="POST" action="{{ route('admin.dezerx.addons.update', $key) }}">
    @if ($setup !== [])
        <div class="row">
            <div class="col-xs-12">
                <div class="box box-info">
                    <div class="box-header with-border">
                        <h3 class="box-title">Setting this up at Google</h3>
                    </div>

                    <div class="box-body">
                        <ol class="pm-setup">
                            @foreach ($setup as $step)
                                <li>
                                    <strong>{{ $step['title'] }}</strong>
                                    <p class="small">{!! $step['body'] !!}</p>

                                    @foreach ($step['fields'] as $field)
                                        <div class="pm-setup-field">
                                            <label class="control-label">{{ $field['label'] }}</label>
                                            <div class="input-group">
                                                <input type="text" class="form-control pm-copy" readonly
                                                       value="{{ $field['value'] }}"
                                                       placeholder="(leave empty)">
                                                <span class="input-group-btn">
                                                    <button type="button" class="btn btn-default pm-copy-btn"
                                                            @if ($field['value'] === '') disabled @endif>Copy</button>
                                                </span>
                                            </div>
                                            <p class="text-muted small">{{ $field['note'] }}</p>
                                        </div>
                                    @endforeach
                                </li>
                            @endforeach
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    @endif

    <div class="row">
        <div class="{{ $pickers === [] ? 'col-sm-6' : 'col-sm-4' }}">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Status</h3></div>
                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Enabled</label>
                        <div>
                            <select name="enabled" class="form-control">
                                <option value="0" @if (! $config['enabled']) selected @endif>Off</option>
                                <option value="1" @if ($config['enabled']) selected @endif>On</option>
                            </select>
                            <p class="text-muted small">
                                @if ($scoped)
                                    Off hides the tab everywhere and makes its endpoints answer 404, whatever is
                                    ticked on the right.
                                @else
                                    Off hides this addon's fields everywhere and stops it acting. Nothing already
                                    saved is thrown away.
                                @endif
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            @if ($extras !== [])
                <div class="box box-warning">
                    <div class="box-header with-border"><h3 class="box-title">{{ $extrasTitle }}</h3></div>
                    <div class="box-body">
                        @foreach ($extras as $extra)
                            <div class="form-group">
                                <label class="control-label">{{ $labels[$extra]['label'] ?? $extra }}</label>

                                @if (! empty($labels[$extra]['choices']))
                                    <select class="form-control" name="extras[{{ $extra }}]">
                                        @foreach ($labels[$extra]['choices'] as $value => $label)
                                            <option value="{{ $value }}"
                                                @if (($config[$extra] ?? '') === (string) $value) selected @endif>
                                                {{ $label }}
                                            </option>
                                        @endforeach
                                    </select>
                                @else
                                    <input type="text" class="form-control" autocomplete="off"
                                           name="extras[{{ $extra }}]"
                                           value="{{ $config[$extra] ?? '' }}"
                                           placeholder="{{ $labels[$extra]['placeholder'] ?? '' }}">
                                @endif

                                <p class="text-muted small">{!! $labels[$extra]['help'] ?? '' !!}</p>
                            </div>
                        @endforeach
                    </div>
                </div>
            @endif

            @if ($notes !== [])
                <div class="box">
                    <div class="box-header with-border"><h3 class="box-title">What it needs</h3></div>
                    <div class="box-body">
                        @foreach ($notes as $note)
                            <p class="small @if ($loop->last) no-margin @endif">{!! $note !!}</p>
                        @endforeach
                    </div>
                </div>
            @endif

            @if ($pickers === [] || $legacy)
                <div class="box">
                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-sm btn-primary pull-right">Save</button>
                    </div>
                </div>
            @endif

        </div>

        <div class="col-sm-8">
            @foreach ($pickers as $picker)
                <div class="box box-primary pm-picker @if ($legacy) pm-legacy collapsed-box @endif">
                    <div class="box-header with-border">
                        <h3 class="box-title">
                            @if ($legacy)
                                <span class="label label-default pm-legacy-tag">Legacy</span>
                            @endif
                            {{ $picker['label'] }} <span class="label label-primary pm-count">0</span>
                        </h3>
                        <div class="box-tools">
                            @if ($legacy)
                                <button type="button" class="btn btn-box-tool" data-widget="collapse" title="Show the list">
                                    <i class="fa fa-plus"></i>
                                </button>
                            @else
                                <button type="button" class="btn btn-xs btn-default pm-all">Select all</button>
                                <button type="button" class="btn btn-xs btn-default pm-none">Select none</button>
                            @endif
                        </div>
                    </div>

                    <div class="box-body">
                        @if ($legacy)
                            <div class="pm-legacy-note">
                                <p class="small">
                                    @if (count($eggRules) > 0)
                                        <strong>Not in use.</strong> Egg Rules below decide this now. The list is
                                        kept so nothing is lost, and takes over again only if every rule is deleted.
                                    @else
                                        <strong>Being replaced by Egg Rules below.</strong> Still used until the first
                                        rule is added, after which the rules decide instead.
                                    @endif
                                </p>
                                <div>
                                    <button type="button" class="btn btn-xs btn-default pm-all">Select all</button>
                                    <button type="button" class="btn btn-xs btn-default pm-none">Select none</button>
                                </div>
                            </div>
                        @endif

                        @if ($picker['help'])
                            <p class="text-muted small">{!! $picker['help'] !!}</p>
                        @endif

                        <div class="pm-search">
                            <i class="fa fa-search"></i>
                            <input type="text" class="form-control pm-search-input" autocomplete="off"
                                   placeholder="Search eggs and nests…">
                        </div>

                        @foreach ($nests as $nest)
                            <div class="pm-nest" data-nest="{{ strtolower($nest->name) }}">
                                <div class="pm-nest-head">
                                    <span class="pm-nest-title">{{ $nest->name }}</span>
                                    @if (! $nest->eggs->isEmpty())
                                        <button type="button" class="btn btn-xs btn-link pm-nest-all">Toggle all</button>
                                    @endif
                                </div>

                                <div class="pm-eggs">
                                    @foreach ($nest->eggs as $egg)
                                        <label class="pm-egg @if (in_array($egg->uuid, $picker['selected'], true)) is-on @endif"
                                               data-egg="{{ strtolower($egg->name) }}">
                                            <input type="checkbox" name="{{ $picker['name'] }}" value="{{ $egg->uuid }}"
                                                @if (in_array($egg->uuid, $picker['selected'], true)) checked @endif>
                                            <span class="pm-tick"><i class="fa fa-check"></i></span>
                                            <span class="pm-egg-name">{{ $egg->name }}</span>
                                        </label>
                                    @endforeach

                                    @if ($nest->eggs->isEmpty())
                                        <p class="text-muted small no-margin">No eggs in this nest.</p>
                                    @endif
                                </div>
                            </div>
                        @endforeach

                        <p class="text-muted pm-empty" style="display:none;">Nothing matches that search.</p>
                    </div>

                    @if ($loop->last && ! $legacy)
                        <div class="box-footer">
                            {!! csrf_field() !!}
                            <button type="submit" class="btn btn-sm btn-primary pull-right">Save</button>
                        </div>
                    @endif
                </div>
            @endforeach
        </div>
    </div>
</form>

@if (isset($eggRules))
    @include('admin.dezerx.addons.egg-rules', ['rules' => $eggRules])
@endif
@endsection

@section('scripts')
    @parent
    <style>
        .pm-setup { margin: 0; padding-left: 20px; }
        .pm-setup > li { margin-bottom: 14px; }
        .pm-setup > li:last-child { margin-bottom: 0; }
        .pm-setup > li > p { margin: 3px 0 0; color: var(--sa-muted, #7a8794); }
        .pm-setup-field { max-width: 640px; margin-top: 8px; }
        .pm-setup-field .form-control[readonly] { background: var(--sa-well, #f6f8fa); font-family: monospace; font-size: 12px; }
        .pm-setup-field > p { margin: 4px 0 0; }

        .pm-search { position: relative; margin-bottom: 15px; }
        .pm-search .fa { position: absolute; left: 10px; top: 10px; color: var(--sa-faint, #b8c2cc); }
        .pm-search input { padding-left: 30px; }

        .pm-nest + .pm-nest { margin-top: 18px; }
        .pm-nest-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
        .pm-nest-title { font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: var(--sa-muted, #8a95a1); }
        .pm-nest-head .btn-link { padding: 0; font-size: 11px; }

        .pm-eggs { display: flex; flex-wrap: wrap; }
        .pm-egg {
            display: flex; align-items: center; width: 50%; margin: 0; padding: 7px 10px;
            font-weight: 400; cursor: pointer; border: 1px solid transparent; border-radius: 3px;
        }
        .pm-egg:hover { background: var(--sa-hover, #f6f8fa); }
        .pm-egg.is-on { background: var(--sa-tint, #eaf3fa); border-color: var(--sa-tint-edge, #a9cee6); }
        .pm-egg input { position: absolute; opacity: 0; width: 0; height: 0; }
        .pm-tick {
            flex: 0 0 16px; width: 16px; height: 16px; margin-right: 9px; border: 1px solid var(--sa-field-edge, #c4ccd4);
            border-radius: 3px; background: var(--sa-field, #fff); color: var(--sa-on-accent, #fff); font-size: 10px; line-height: 15px; text-align: center;
        }
        .pm-egg.is-on .pm-tick { background: var(--sa-accent, #3c8dbc); border-color: var(--sa-accent, #3c8dbc); }
        .pm-tick .fa { visibility: hidden; }
        .pm-egg.is-on .pm-tick .fa { visibility: visible; }
        .pm-egg.is-on .pm-egg-name { font-weight: 600; }
        .pm-egg-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .pm-legacy .box-header { cursor: pointer; }
        .pm-legacy .box-title { opacity: .8; }
        .pm-legacy-tag { margin-right: 4px; vertical-align: 1px; }
        .pm-legacy-note {
            display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
            margin-bottom: 15px; padding: 9px 12px; border-radius: 3px;
            background: var(--sa-warn-bg, #fcf8e3); color: var(--sa-warn-ink, #8a6d3b);
        }
        .pm-legacy-note p { margin: 0; }
        .pm-legacy-note > div { flex: 0 0 auto; }

        .er-table { margin-bottom: 0; table-layout: fixed; }
        .er-table > thead > tr > th { border-bottom-width: 1px; }
        .er-table > tbody > tr > td { vertical-align: top; }
        .er-table .er-id { width: 44px; color: var(--sa-muted, #8a95a1); }
        .er-table .er-actions { width: 150px; white-space: nowrap; }
        .er-table .er-actions form { display: flex; gap: 4px; }
    </style>
@endsection

@section('footer-scripts')
    @parent
    <script>
        $('.pm-copy-btn').on('click', function () {
            var field = $(this).closest('.input-group').find('.pm-copy')[0];
            var button = $(this);

            field.select();
            field.setSelectionRange(0, field.value.length);

            var done = function () { button.text('Copied'); setTimeout(function () { button.text('Copy'); }, 1500); };

            if (navigator.clipboard) {
                navigator.clipboard.writeText(field.value).then(done, function () {});
            } else if (document.execCommand('copy')) {
                done();
            }
        });

        (function () {
            $('.pm-picker').each(function () {
                var picker = $(this);
                var boxes = picker.find('input[type="checkbox"]');

                function paint() {
                    boxes.each(function () {
                        $(this).closest('.pm-egg').toggleClass('is-on', this.checked);
                    });

                    picker.find('.pm-count').text(boxes.filter(':checked').length + ' selected');
                }

                function visible(scope) {
                    return (scope || picker).find('.pm-egg:not(.pm-hidden) input[type="checkbox"]');
                }

                boxes.on('change', paint);

                picker.find('.pm-all').on('click', function () { visible().prop('checked', true); paint(); });
                picker.find('.pm-none').on('click', function () { visible().prop('checked', false); paint(); });

                picker.find('.pm-nest-all').on('click', function () {
                    var eggs = visible($(this).closest('.pm-nest'));

                    eggs.prop('checked', eggs.filter(':checked').length !== eggs.length);
                    paint();
                });

                picker.find('.pm-search-input').on('input', function () {
                    var term = $.trim(this.value).toLowerCase();
                    var shown = 0;

                    picker.find('.pm-nest').each(function () {
                        var nest = $(this);
                        var whole = term !== '' && String(nest.data('nest')).indexOf(term) !== -1;
                        var hits = 0;

                        nest.find('.pm-egg').each(function () {
                            var match = term === '' || whole || String($(this).data('egg')).indexOf(term) !== -1;

                            $(this).toggleClass('pm-hidden', !match).toggle(match);
                            hits += match ? 1 : 0;
                        });

                        nest.toggle(hits > 0);
                        shown += hits;
                    });

                    picker.find('.pm-empty').toggle(shown === 0);
                });

                paint();
            });
        })();

        $('.pm-legacy .box-header').on('click', function (event) {
            if (!$(event.target).closest('[data-widget="collapse"]').length) {
                $(this).find('[data-widget="collapse"]').trigger('click');
            }
        });

        (function () {
            var box = $('#egg-rules');
            if (!box.length) {
                return;
            }

            var body = box.find('.er-table > tbody');
            var none = body.find('.er-none');
            var add = box.find('.er-add');

            function pickers(scope) {
                scope.find('.er-select').select2({ width: '100%', placeholder: 'Pick eggs…', closeOnSelect: false });
            }

            pickers(body);

            add.on('click', function () {
                var row = $($('#egg-rule-new').html());

                none.hide();
                body.append(row);
                pickers(row);
                add.prop('disabled', true);
                row.find('.er-select').first().select2('open');
            });

            body.on('click', '.er-cancel', function () {
                $(this).closest('tr').remove();
                add.prop('disabled', false);
                none.toggle(body.children('tr').not(none).length === 0);
            });

            body.on('click', '.er-delete', function (event) {
                if (!window.confirm('Delete this egg rule? Servers it covered stop being offered its eggs.')) {
                    event.preventDefault();
                }
            });
        })();
    </script>
@endsection
