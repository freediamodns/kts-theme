@php
    $router = app('router');
    $starkBanner = \Pterodactyl\Services\Dezerx\Allocations\EggArtwork::banner($server->egg?->uuid, $server->egg?->name);
    $starkArt = fn (string $url) => 'url("' . str_replace(['\\', '"', "\n", "\r", '<', '>'], ['%5C', '%22', '', '', '%3C', '%3E'], $url) . '")';
@endphp

<style>
    .stark-admin .skin-blue .content-wrapper {
        --sv-art: {!! $starkArt($starkBanner['dark']) !!};
        --sv-veil: color-mix(in srgb, var(--surface-base) var(--sv-dim, 80%), transparent);
        background-image:
            linear-gradient(to bottom,
                color-mix(in srgb, var(--surface-base) var(--sv-top, 40%), transparent) 0,
                color-mix(in srgb, var(--surface-base) var(--sv-mid, 85%), transparent) 210px,
                var(--surface-base) 420px),
            linear-gradient(var(--sv-veil), var(--sv-veil)),
            var(--sv-art);
        background-repeat: no-repeat;
        background-size: 100% 100%, 100% 100%, max(100%, 960px) auto;
        background-position: 0 0, 0 0, center 0;
    }
    .stark-admin.light .skin-blue .content-wrapper {
        --sv-art: {!! $starkArt($starkBanner['light']) !!};
        --sv-dim: 30%;
        --sv-top: 0%;
        --sv-mid: 40%;
    }
</style>
<div class="row">
    <div class="col-xs-12">
        <div class="nav-tabs-custom nav-tabs-floating">
            <ul class="nav nav-tabs">
                <li class="{{ $router->currentRouteNamed('admin.servers.view') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view', $server->id) }}">About</a></li>
                @if($server->isInstalled())
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.details') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.details', $server->id) }}">Details</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.build') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.build', $server->id) }}">Build Configuration</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.startup') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.startup', $server->id) }}">Startup</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.database') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.database', $server->id) }}">Database</a>
                    </li>
                    <li class="{{ $router->currentRouteNamed('admin.servers.view.mounts') ? 'active' : '' }}">
                        <a href="{{ route('admin.servers.view.mounts', $server->id) }}">Mounts</a>
                    </li>
                @endif
                <li class="{{ $router->currentRouteNamed('admin.servers.view.manage') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view.manage', $server->id) }}">Manage</a>
                </li>
                <li class="tab-danger {{ $router->currentRouteNamed('admin.servers.view.delete') ? 'active' : '' }}">
                    <a href="{{ route('admin.servers.view.delete', $server->id) }}">Delete</a>
                </li>
                <li class="tab-success">
                    <a href="/server/{{ $server->uuidShort }}" target="_blank"><i class="fa fa-external-link"></i></a>
                </li>
            </ul>
        </div>
    </div>
</div>
