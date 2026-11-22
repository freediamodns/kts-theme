
@if ($theme['fontHref'])
    <link rel="preconnect" href="https://fonts.bunny.net" crossorigin>
    <link href="{{ $theme['fontHref'] }}" rel="stylesheet">
@endif

<link rel="stylesheet" href="{{ $theme['stylesheet'] }}">
@if ($theme['hints'])
    <script src="{{ $theme['hints'] }}" defer></script>
@endif
<style id="appearance-base">{!! $theme['tokens'] !!}</style>

<script>
    (function () {
        var root = document.documentElement;
        var pinned = @json($theme['mode']);
        var presets = @json($theme['presets']);
        var fallback = @json($theme['defaultPreset']);
        var choosable = @json($theme['allowUserPresets']);
        var motion = @json($theme['motion']);

        var read = function (key) {
            try {
                return window.localStorage.getItem(key);
            } catch (e) {
                return null;
            }
        };

        var mode = function (value) {
            var light = (pinned || value) === 'light';

            root.classList.toggle('light', light);
            root.style.colorScheme = light ? 'light' : 'dark';
            window.dispatchEvent(new CustomEvent('stark:theme'));
        };

        var preset = function (id) {
            var chosen = (choosable && presets[id]) || presets[fallback];
            var style = document.getElementById('appearance-preset');
            var css = '';

            if (!style) {
                style = document.createElement('style');
                style.id = 'appearance-preset';
                document.head.appendChild(style);
            }

            [[':root', chosen && chosen.dark], [':root.light', chosen && chosen.light]].forEach(function (pair) {
                var body = '';

                Object.keys(pair[1] || {}).forEach(function (name) {
                    body += '--' + name + ':' + pair[1][name] + ';';
                });

                if (body) {
                    css += pair[0] + '{' + body + '}';
                }
            });

            style.textContent = css;
            window.dispatchEvent(new CustomEvent('stark:theme'));
        };

        root.setAttribute('data-sa-button', motion.button);
        root.setAttribute('data-sa-page', motion.page);
        root.setAttribute('data-sa-active', motion.active);

        mode(read('dezerx.theme'));
        preset(read('dezerx.preset'));

        window.addEventListener('storage', function (event) {
            if (event.key === 'dezerx.theme') {
                mode(event.newValue);
            } else if (event.key === 'dezerx.preset') {
                preset(event.newValue);
            }
        });

        document.addEventListener('click', function (event) {
            var target = event.target instanceof Element ? event.target.closest('[data-stark-mode]') : null;

            if (!target) {
                return;
            }

            event.preventDefault();

            var next = root.classList.contains('light') ? 'dark' : 'light';
            var box = target.getBoundingClientRect();
            var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            try {
                window.localStorage.setItem('dezerx.theme', next);
            } catch (e) {}

            if (!document.startViewTransition || calm) {
                mode(next);

                return;
            }

            root.style.setProperty('--sa-x', box.left + box.width / 2 + 'px');
            root.style.setProperty('--sa-y', box.top + box.height / 2 + 'px');
            document.startViewTransition(function () {
                mode(next);
            });
        });
    })();
</script>
