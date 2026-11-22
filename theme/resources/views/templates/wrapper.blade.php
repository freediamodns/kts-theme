<!DOCTYPE html>

<html class="dz-html">
    <head>
        @php($dezerx = \Pterodactyl\Services\Dezerx\Seo::forPath(request()->getPathInfo()))

        <title>{{ $dezerx['title'] }}</title>

        @php($dezerxColorMode = \Pterodactyl\Services\Dezerx\Theme::payload()['nav.colorMode'] ?? 'switch')

        <script>
            (function () {
                var pinned = @json($dezerxColorMode);
                var light = pinned === 'light';

                if (pinned === 'switch') {
                    try {
                        light = window.localStorage.getItem('dezerx.theme') === 'light';
                    } catch (e) {}
                }

                if (light) {
                    document.documentElement.classList.add('light');
                }

                document.documentElement.style.colorScheme = light ? 'light' : 'dark';
            })();
        </script>
        
        @php($dezerxBootSurface = ($css['boot'] ?? 'base') === 'shell'
            && (\Pterodactyl\Services\Dezerx\Theme::config()['sidebar.design'] ?? 'floating') !== 'floating'
                ? ['surface-card', 'rgb(15 18 25)', 'rgb(244 246 249)']
                : ['surface-base', 'rgb(11 13 18)', 'rgb(255 255 255)'])

        <style id="theme-boot">
            :root{--boot-surface:var(--{{ $dezerxBootSurface[0] }},{{ $dezerxBootSurface[1] }});}
            :root.light{--boot-surface:var(--{{ $dezerxBootSurface[0] }},{{ $dezerxBootSurface[2] }});}
            html.dz-html{background-color:var(--boot-surface);}
            html.dz-html body{background-color:transparent;}
        </style>

        @section('meta')
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
            <meta name="csrf-token" content="{{ csrf_token() }}">
            <meta name="robots" content="{{ $dezerx['robots'] }}">
            <link rel="canonical" href="{{ $dezerx['canonical'] }}">

            @if ($dezerx['description'] !== '')
                <meta name="description" content="{{ $dezerx['description'] }}">
            @endif

            @if ($dezerx['keywords'] !== '')
                <meta name="keywords" content="{{ $dezerx['keywords'] }}">
            @endif

            <meta property="og:type" content="website">
            @php($seoPanelName = trim((string) config('app.name', 'KTS Host')))
            @php($seoPanelName = in_array(strtolower($seoPanelName), ['pterodactyl', 'pterodactyl panel', ''], true) ? 'KTS Host' : $seoPanelName)
            <meta property="og:site_name" content="{{ $seoPanelName }}">
            <meta property="og:title" content="{{ $dezerx['title'] }}">
            <meta property="og:url" content="{{ $dezerx['canonical'] }}">

            @if ($dezerx['description'] !== '')
                <meta property="og:description" content="{{ $dezerx['description'] }}">
            @endif

            @if ($dezerx['image'])
                <meta property="og:image" content="{{ $dezerx['image'] }}">
                <meta property="og:image:width" content="1200">
                <meta property="og:image:height" content="630">
                <meta name="twitter:card" content="summary_large_image">
                <meta name="twitter:image" content="{{ $dezerx['image'] }}">
            @else
                <meta name="twitter:card" content="summary">
            @endif

            <meta name="twitter:title" content="{{ $dezerx['title'] }}">

            @if ($dezerx['description'] !== '')
                <meta name="twitter:description" content="{{ $dezerx['description'] }}">
            @endif

            @if ($dezerx['twitter'] !== '')
                <meta name="twitter:site" content="{{ $dezerx['twitter'] }}">
            @endif
            @if ($dezerx['favicon'] !== '')
                <link rel="icon" href="{{ $dezerx['favicon'] }}">
                <link rel="shortcut icon" href="{{ $dezerx['favicon'] }}">
                <link rel="apple-touch-icon" href="{{ $dezerx['favicon'] }}">
            @else
                <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
                <link rel="icon" type="image/png" href="/favicons/favicon-32x32.png" sizes="32x32">
                <link rel="icon" type="image/png" href="/favicons/favicon-16x16.png" sizes="16x16">
                <link rel="manifest" href="/favicons/manifest.json">
                <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#bc6e3c">
                <link rel="shortcut icon" href="/favicons/favicon.ico">
                <meta name="msapplication-config" content="/favicons/browserconfig.xml">
            @endif
            <meta name="theme-color" content="{{ $dezerx['themeColor'] }}">
        @show

        @php($dezerxFontHref = \Pterodactyl\Services\Dezerx\Appearance::fontHref())

        @if ($dezerxFontHref)
            <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
            <link href="{{ $dezerxFontHref }}" rel="stylesheet">
        @endif

        @section('user-data')
            @if(!is_null(Auth::user()))
                <script>
                    window.PterodactylUser = {!! json_encode(Auth::user()->toVueObject()) !!};
                </script>
            @endif
            @if(!empty($siteConfiguration))
                <script>
                    window.SiteConfiguration = {!! json_encode($siteConfiguration) !!};
                </script>
            @endif
        @show

        <script>
            (function () {
                var opened = [];
                var open = window.open;

                window.open = function (url) {
                    var child = open.apply(window, arguments);

                    try {
                        var target = new URL(String(url || ''), location.href);

                        if (child && target.origin === location.origin && target.pathname.indexOf('/world-viewer/') === 0) {
                            opened.push({ window: child, root: target });
                        }
                    } catch (error) {}

                    return child;
                };

                var asked = function (from) {
                    var frames = document.getElementsByTagName('iframe');

                    for (var index = 0; index < frames.length; index++) {
                        if (frames[index].contentWindow === from) {
                            try {
                                return new URL(frames[index].getAttribute('src'), location.href);
                            } catch (error) {
                                return null;
                            }
                        }
                    }

                    opened = opened.filter(function (entry) {
                        return entry.window && !entry.window.closed;
                    });

                    for (var spot = 0; spot < opened.length; spot++) {
                        if (opened[spot].window === from) {
                            return opened[spot].root;
                        }
                    }

                    return null;
                };

                window.addEventListener('message', function (event) {
                    var message = event.data;

                    if (!message || message.channel !== 'world-viewer' || !event.source || !message.id) {
                        return;
                    }

                    var root = asked(event.source);

                    if (!root) {
                        return;
                    }

                    if (root.origin !== location.origin || root.pathname.indexOf('/world-viewer/') !== 0) {
                        return;
                    }

                    var answer = function (payload, transfer) {
                        payload.channel = 'world-viewer';
                        payload.id = message.id;

                        try {
                            event.source.postMessage(payload, '*', transfer || []);
                        } catch (error) {
                            event.source.postMessage(
                                { channel: 'world-viewer', id: message.id, error: 'the reply could not be sent' },
                                '*'
                            );
                        }
                    };

                    if (message.ping) {
                        return answer({ pong: true });
                    }

                    var target;

                    try {
                        target = new URL(String(message.url), root.href);
                    } catch (error) {
                        return answer({ error: 'that is not an address' });
                    }

                    if (target.origin !== location.origin || target.pathname.indexOf(root.pathname) !== 0) {
                        return answer({ error: 'that is not part of this map' });
                    }

                    fetch(target.href, { credentials: 'same-origin' })
                        .then(function (response) {
                            return response.arrayBuffer().then(function (body) {
                                answer(
                                    {
                                        status: response.status,
                                        type: response.headers.get('Content-Type') || '',
                                        body: body,
                                    },
                                    [body]
                                );
                            });
                        })
                        .catch(function (error) {
                            answer({ error: String((error && error.message) || error) });
                        });
                });
            })();
        </script>

        @yield('assets')

        @include('layouts.scripts')

        @if (\Pterodactyl\Services\Dezerx\Runtime::ok())
        <style id="appearance-base">{!! \Pterodactyl\Services\Dezerx\Appearance::css() !!}</style>
        <style id="theme-base">{!! \Pterodactyl\Services\Dezerx\Theme::css() !!}</style>
        @endif
        {!! \Pterodactyl\Services\Dezerx\Runtime::head() !!}

        <script>
            (function () {
                var presets = @json(\Pterodactyl\Services\Dezerx\Appearance::presetStyles());
                var config = @json(\Pterodactyl\Services\Dezerx\Appearance::payload());

                var chosen = null;

                if (config.allowUserPresets) {
                    try {
                        chosen = window.localStorage.getItem('dezerx.preset');
                    } catch (e) {}
                }

                var preset = presets[chosen] || presets[config.defaultPreset];

                if (!preset) {
                    return;
                }

                var css = '';

                [[':root', preset.dark], [':root.light', preset.light]].forEach(function (pair) {
                    var body = '';

                    Object.keys(pair[1] || {}).forEach(function (name) {
                        body += '--' + name + ':' + pair[1][name] + ';';
                    });

                    if (body) {
                        css += pair[0] + '{' + body + '}';
                    }
                });

                var style = document.createElement('style');

                style.id = 'appearance-preset';
                style.textContent = css;
                document.head.appendChild(style);
            })();
        </script>
    </head>
    <body class="dz-body {{ $css['body'] ?? '' }}">
        @section('content')
            @yield('above-container')
            @yield('container')
            @yield('below-container')
        @show
        @section('scripts')
            {!! $asset->js('main.js') !!}
        @show
    </body>
</html>
