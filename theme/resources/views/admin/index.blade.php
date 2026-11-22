@extends('layouts.admin')

@section('title')
    Administration
@endsection

@section('content')
@php($dzOverview = \Pterodactyl\Services\Dezerx\Addons::get(\Pterodactyl\Services\Dezerx\Addons::ADMIN_OVERVIEW)['enabled'] ?? false)
<div class="row">
    <div class="col-xs-12">
        <div class="box
            @if($version->isLatestPanel())
                box-success
            @else
                box-danger
            @endif
        ">
            <div class="box-header with-border">
                <h3 class="box-title">System Information</h3>
            </div>
            <div class="box-body dzo-sysinfo">
                <div>
                    @if ($version->isLatestPanel())
                        You are running KTS Host version <code>{{ config('app.version') }}</code> powered by <a href="https://ktshost.asia/" target="_blank" rel="noopener noreferrer" style="color:var(--sa-accent, #4d9ff2);font-weight:600">KTS Host</a>
                    @else
                        Your panel is <strong>not up-to-date!</strong> The latest version is <a href="https://github.com/Pterodactyl/Panel/releases/v{{ $version->getPanel() }}" target="_blank"><code>{{ $version->getPanel() }}</code></a> and you are currently running version <code>{{ config('app.version') }}</code>. You can find instructions on how to update your panel <a href="https://pterodactyl.io/panel/1.0/updating.html">here</a>. Powered by <a href="https://ktshost.asia/" target="_blank" rel="noopener noreferrer" style="color:var(--sa-accent, #4d9ff2);font-weight:600">KTS Host</a>.
                    @endif
                </div>
                @if ($dzOverview ?? false)
                    @include('admin.dezerx.overview.controls')
                @endif
            </div>
        </div>
    </div>
</div>
@if ($dzOverview ?? false)
    @include('admin.dezerx.overview.dashboard')
@endif
<div class="row">
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="{{ $version->getDiscord() }}"><button class="btn btn-warning" style="width:100%;"><i class="fa fa-fw fa-support"></i> Get Help <small>(via Discord)</small></button></a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://pterodactyl.io"><button class="btn btn-primary" style="width:100%;"><i class="fa fa-fw fa-link"></i> Documentation</button></a>
    </div>
    <div class="clearfix visible-xs-block">&nbsp;</div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="https://github.com/pterodactyl/panel"><button class="btn btn-primary" style="width:100%;"><i class="fa fa-fw fa-support"></i> GitHub</button></a>
    </div>
    <div class="col-xs-6 col-sm-3 text-center">
        <a href="{{ $version->getDonations() }}"><button class="btn btn-success" style="width:100%;"><i class="fa fa-fw fa-money"></i> Support the Project</button></a>
    </div>
</div>
@endsection
