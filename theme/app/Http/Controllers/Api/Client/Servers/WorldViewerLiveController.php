<?php
 namespace Pterodactyl\Http\Controllers\Api\Client\Servers; use Generator; use Throwable; use Illuminate\Http\Request; use Pterodactyl\Models\Server; use Illuminate\Support\Facades\Http; use Illuminate\Support\Facades\Cache; use Pterodactyl\Http\Controllers\Controller; use Symfony\Component\HttpFoundation\Response; use Pterodactyl\Services\Dezerx\Minecraft\BlueMap; use Illuminate\Http\Client\Response as Upstream; use Pterodactyl\Services\Dezerx\Minecraft\ServerFiles; class WorldViewerLiveController extends Controller { private const HEADERS = [ 'X-Frame-Options' => 'SAMEORIGIN', 'X-Content-Type-Options' => 'nosniff', 'Access-Control-Allow-Origin' => '*', 'Cross-Origin-Resource-Policy' => 'cross-origin', ]; private const SHIM = <<<'HTML'
        <script>
        (function () {
            ['localStorage', 'sessionStorage'].forEach(function (name) {
                try { window[name].getItem('bluemap-probe'); return; } catch (error) {}

                var store = {};
                var shim = {
                    getItem: function (key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
                    setItem: function (key, value) { store[key] = String(value); },
                    removeItem: function (key) { delete store[key]; },
                    clear: function () { store = {}; },
                    key: function (index) { var keys = Object.keys(store); return index < keys.length ? keys[index] : null; },
                };

                Object.defineProperty(shim, 'length', { get: function () { return Object.keys(store).length; } });

                try { Object.defineProperty(window, name, { value: shim, configurable: true }); } catch (error) {}
            });

            var base = location.pathname.split('/').slice(0, 3).join('/') + '/';
            var ours = function (url) {
                try {
                    var target = new URL(String(url), location.href);

                    return target.host === location.host && target.pathname.indexOf(base) === 0;
                } catch (error) {
                    return false;
                }
            };

            var pending = {};
            var count = 0;
            var relay = false;
            var host = window.parent !== window ? window.parent : window.opener;

            window.addEventListener('message', function (event) {
                var reply = event.data;

                if (!reply || reply.channel !== 'world-viewer' || !pending[reply.id]) { return; }

                var slot = pending[reply.id];
                delete pending[reply.id];
                clearTimeout(slot.timer);

                if (reply.error) { slot.reject(new Error(reply.error)); } else { slot.resolve(reply); }
            });

            var ask = function (message, wait) {
                return new Promise(function (resolve, reject) {
                    if (!host) { return reject(new Error('there is no panel to ask')); }

                    var id = ++count;
                    message.channel = 'world-viewer';
                    message.id = id;

                    pending[id] = {
                        resolve: resolve,
                        reject: reject,
                        timer: setTimeout(function () {
                            delete pending[id];
                            reject(new Error('the panel did not answer'));
                        }, wait),
                    };

                    try { host.postMessage(message, '*'); } catch (error) { reject(error); }
                });
            };

            var get = function (url) { return ask({ url: String(url) }, 30000); };

            var refused = function (status) {
                return new Error(status === 404
                    ? 'the panel answered 404, which is what a web server that answers for .js and .css files itself returns'
                    : 'the panel answered ' + status);
            };

            var fetching = window.fetch;

            if (typeof fetching === 'function') {
                window.fetch = function (input, init) {
                    var url = typeof input === 'string' ? input : (input && input.url) || '';

                    if (!relay || !ours(url)) { return fetching.apply(window, arguments); }

                    return get(url).then(function (reply) {
                        var status = reply.status || 200;

                        return new Response(status === 204 || status === 304 ? null : reply.body, {
                            status: status,
                            headers: reply.type ? { 'Content-Type': reply.type } : {},
                        });
                    });
                };
            }

            var property = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');

            var address = function (reply) {
                try {
                    return URL.createObjectURL(new Blob([reply.body], { type: reply.type || 'application/octet-stream' }));
                } catch (error) {}

                var bytes = new Uint8Array(reply.body);
                var binary = '';

                for (var index = 0; index < bytes.length; index++) { binary += String.fromCharCode(bytes[index]); }

                return 'data:' + (reply.type || 'application/octet-stream') + ';base64,' + btoa(binary);
            };

            if (property && property.set) {
                Object.defineProperty(HTMLImageElement.prototype, 'src', {
                    configurable: true,
                    get: function () { return property.get.call(this); },
                    set: function (value) {
                        var element = this;

                        if (!relay || !ours(value)) { return property.set.call(element, value); }

                        get(value).then(
                            function (reply) {
                                try { element.crossOrigin = null; } catch (error) {}

                                property.set.call(element, address(reply));
                            },
                            function () { property.set.call(element, value); }
                        );
                    },
                });
            }

            var notice = function (text) {
                try { console.error('[world viewer] ' + text); } catch (error) {}

                if (document.getElementById('map-not-served')) { return; }

                var note = document.createElement('div');
                note.id = 'map-not-served';
                note.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;'
                    + 'justify-content:center;padding:24px;text-align:center;background:#0f1219;color:#c9d1e0;'
                    + 'font:13px/1.7 ui-sans-serif,system-ui,sans-serif';
                note.textContent = text;

                (document.body || document.documentElement).appendChild(note);
            };

            var embed = function (text, url) {
                var sheet = text.replace(
                    /url\((['"]?)(?!data:|https?:|\/|#)(\.\/)?/gi,
                    'url($1' + url.replace(/[^/]*$/, '')
                );

                if (!relay) { return Promise.resolve(sheet); }

                var targets = [];

                (sheet.match(/url\(['"]?[^'")]+['"]?\)/gi) || []).forEach(function (reference) {
                    var target = reference.replace(/^url\(['"]?/i, '').replace(/['"]?\)$/, '');

                    if (ours(target) && targets.indexOf(target) < 0) { targets.push(target); }
                });

                return Promise.all(targets.map(function (target) {
                    return get(target).then(function (reply) {
                        return (reply.status || 200) >= 400 ? null : { target: target, url: address(reply) };
                    }, function () { return null; });
                })).then(function (found) {
                    found.forEach(function (result) {
                        if (result) { sheet = sheet.split(result.target).join(result.url); }
                    });

                    return sheet;
                });
            };

            var boot = function () {
                var assets = window.__mapAssets || [];

                var load = function (index) {
                    if (index >= assets.length) { return; }

                    var asset = assets[index];
                    var url = new URL(asset.url, location.href).href;
                    var next = function () { load(index + 1); };
                    var source = relay
                        ? get(url).then(function (reply) {
                              var status = reply.status || 200;

                              if (status >= 400) { throw refused(status); }

                              return new TextDecoder().decode(reply.body);
                          })
                        : fetching(url).then(function (response) {
                              if (!response.ok) { throw refused(response.status); }

                              return response.text();
                          });

                    source.then(function (text) {
                        return asset.kind === 'css' ? embed(text, url) : text;
                    }).then(function (text) {
                        var element;

                        if (asset.kind === 'css') {
                            element = document.createElement('style');
                        } else {
                            element = document.createElement('script');

                            if (asset.module) { element.type = 'module'; }
                        }

                        element.textContent = text;
                        document.head.appendChild(element);
                        next();
                    }, function (error) {
                        notice('The map could not load ' + url.split('/').pop() + ' - ' + error.message + '.');
                        next();
                    });
                };

                load(0);
            };

            var start = function () {
                ask({ ping: true }, 2000).then(function () { relay = true; }, function () { relay = false; }).then(boot);
            };

            if (document.readyState === 'loading') {
                window.addEventListener('DOMContentLoaded', start);
            } else {
                start();
            }

            window.addEventListener('error', function (event) {
                var element = event.target || {};
                var rel = (element.rel || '').toLowerCase();

                if (element.tagName !== 'SCRIPT' && (element.tagName !== 'LINK' || rel.indexOf('stylesheet') < 0)) { return; }

                notice('The map could not load ' + String(element.src || element.href || '').split('/').pop() + '.');
            }, true);
        })();
        </script>
        HTML; private const WAITING = <<<'HTML'
        <!doctype html>
        <html><head><meta charset="utf-8"><meta http-equiv="refresh" content="10">
        <style>
          html,body{height:100%;margin:0}
          body{display:flex;align-items:center;justify-content:center;
               background:#0f1219;color:#8b94a7;
               font:13px/1.6 ui-sans-serif,system-ui,sans-serif;text-align:center}
          p{margin:0 1rem}
        </style></head>
        <body><p>Server is either offline, or is currently starting up..<br>
        BlueMap reads its resources for a minute or two after each restart.</p></body></html>
        HTML; private static function policy(Request $request, string $token): string { $map = $request->getHttpHost().'/world-viewer/'.$token.'/'; return implode('; ', [ "default-src {$map} blob: data: 'unsafe-inline' 'unsafe-eval'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", 'sandbox allow-scripts allow-pointer-lock', "frame-ancestors 'self'", ]); } public function __invoke(Request $request, string $token, string $path = ''): Response { $policy = self::policy($request, $token); $server = BlueMap::resolve($token); $address = $server === null ? null : BlueMap::cachedAddress(new ServerFiles($server)); $upstream = $address === null ? null : $this->upstream($server, $address, $path, $request); if ($upstream === null) { return $this->unavailable($path, $policy); } $type = mb_strtolower($upstream->header('Content-Type')) ?: 'application/octet-stream'; $encoding = $upstream->header('Content-Encoding'); $headers = ['Content-Security-Policy' => $policy] + self::HEADERS + array_filter([ 'Content-Type' => $type, 'Content-Encoding' => $encoding, 'ETag' => $upstream->header('ETag'), 'Last-Modified' => $upstream->header('Last-Modified'), 'Cache-Control' => self::caching($path, $type), ]); if (in_array($upstream->status(), [204, 304], true)) { return response('', $upstream->status())->withHeaders($headers); } if (self::isDocument($path) && $encoding === '' && str_contains($type, 'text/html')) { return response(self::prepare($upstream->body()), $upstream->status())->withHeaders($headers); } return response($upstream->body(), $upstream->status())->withHeaders($headers); } private function upstream(Server $server, array $address, string $path, Request $request): ?Upstream { $accepts = str_contains(mb_strtolower((string) $request->header('Accept-Encoding')), 'gzip'); $headers = array_filter([ 'Accept-Encoding' => $accepts && !self::isDocument($path) ? 'gzip' : 'identity', 'If-None-Match' => $request->header('If-None-Match'), 'If-Modified-Since' => $request->header('If-Modified-Since'), ]); $tried = []; foreach (self::hosts($server, $address) as $host) { if (!is_string($host) || $host === '' || in_array($host, $tried, true)) { continue; } $tried[] = $host; try { $upstream = Http::withOptions(['decode_content' => false]) ->withHeaders($headers) ->withQueryParameters($request->query()) ->connectTimeout(3) ->timeout(30) ->get(sprintf('http://%s:%d/%s', $host, $address['port'], ltrim($path, '/'))); } catch (Throwable) { continue; } if ($host !== $address['ip']) { Cache::put(BlueMap::portKey($server->uuid), ['ip' => $host, 'port' => $address['port']], BlueMap::PORT_TTL); } return $upstream; } Cache::put(BlueMap::portKey($server->uuid), [], BlueMap::PORT_TTL_MISSING); return null; } private static function hosts(Server $server, array $address): Generator { yield $address['ip']; yield $server->allocations->firstWhere('port', $address['port'])?->ip_alias; yield $server->node?->fqdn; } private static function caching(string $path, string $type): string { $fresh = str_contains($path, '/live/') || str_contains($type, 'text/html'); $fragile = str_contains($type, 'html') || str_contains($type, 'javascript') || str_contains($type, 'css'); return ($fresh ? 'no-store' : 'private, max-age=60').($fragile ? ', no-transform' : ''); } private function unavailable(string $path, string $policy): Response { $headers = ['Content-Security-Policy' => $policy] + self::HEADERS; if (!self::isDocument($path)) { return response('', 503)->withHeaders($headers + ['Cache-Control' => 'no-store']); } return response(self::WAITING, 200)->withHeaders($headers + [ 'Content-Type' => 'text/html; charset=utf-8', 'Cache-Control' => 'no-store, no-transform', ]); } private static function isDocument(string $path): bool { $path = ltrim($path, '/'); return $path === '' || $path === 'index.html'; } private static function prepare(string $html): string { $assets = []; $html = preg_replace_callback( '/<link\b[^>]*\brel=(["\']?)(?:stylesheet|modulepreload)\1[^>]*>|<script\b[^>]*\bsrc=(["\'])(.*?)\2[^>]*>\s*<\/script>/i', function (array $match) use (&$assets) { if (stripos($match[0], '<link') === 0) { if (preg_match('/\brel=(["\']?)stylesheet\1/i', $match[0]) !== 1) { return ''; } if (preg_match('/\bhref=(["\'])(.*?)\1/i', $match[0], $href) !== 1) { return $match[0]; } $assets[] = ['kind' => 'css', 'url' => $href[2]]; return ''; } $assets[] = [ 'kind' => 'js', 'url' => $match[3], 'module' => preg_match('/\btype=(["\']?)module\1/i', $match[0]) === 1, ]; return ''; }, $html, ) ?? $html; $shim = '<script>window.__mapAssets='.json_encode($assets, JSON_UNESCAPED_SLASHES | JSON_HEX_TAG).';</script>'.self::SHIM; $head = stripos($html, '<head>'); return $head === false ? $shim.$html : substr_replace($html, $shim, $head + 6, 0); } } 