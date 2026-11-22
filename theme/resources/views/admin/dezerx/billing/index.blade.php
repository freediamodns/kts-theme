@extends('layouts.admin')

@section('title')
    Billing
@endsection

@section('content-header')
    <h1>Billing<small>Where the panel reads a server's plan, price and invoices from.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.dezerx.addons') }}">KTS Host Addons</a></li>
        <li class="active">Billing</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-sm-7">
        <form action="{{ route('admin.dezerx.billing.update') }}" method="POST">
            <div class="box box-primary">
                <div class="box-header with-border"><h3 class="box-title">Billing panel</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Status</label>
                        <select name="enabled" class="form-control">
                            <option value="0">Disabled</option>
                            <option value="1" @if(old('enabled', $settings['enabled'])) selected @endif>Enabled</option>
                        </select>
                        <p class="text-muted small">
                            When enabled, a server's Overview page shows what it costs and whether anything is owed on
                            it. A server the billing panel does not know about simply shows nothing.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Provider</label>
                        @php($provider = old('provider', $settings['provider']))
                        <select name="provider" id="pBillingProvider" class="form-control">
                            <option value="paymenter" @if($provider === 'paymenter') selected @endif>Paymenter</option>
                            <option value="whmcs" @if($provider === 'whmcs') selected @endif>WHMCS</option>
                            <option value="dezerx" @if($provider === 'dezerx') selected @endif>KTS Host Billing</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Panel address</label>
                        <input type="text" name="endpoint" class="form-control" placeholder="https://billing.example.com"
                               value="{{ old('endpoint', $settings['endpoint']) }}" />
                        <p class="text-muted small">
                            The address customers log into, with no trailing path.
                        </p>
                    </div>

                    <div class="form-group" data-billing="whmcs">
                        <label class="control-label">API identifier</label>
                        <input type="text" name="identifier" class="form-control" autocomplete="off"
                               value="{{ old('identifier', $settings['identifier']) }}" />
                        <p class="text-muted small">
                            From <strong>System Settings · API Credentials</strong> in WHMCS. Paymenter does not use one.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Currency symbol</label>
                        <input type="text" name="currency" class="form-control" maxlength="8" placeholder="e.g. € or USD"
                               value="{{ old('currency', $settings['currency']) }}" />
                        <p class="text-muted small">
                            Shown next to the price on a server's Overview page. Leave blank to use whatever the billing
                            panel reports. Spartan reports no currency at all, so without this its prices show as
                            a bare number.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label"><span data-billing-label="whmcs">API secret</span><span data-billing-label="paymenter">API key</span><span data-billing-label="dezerx">API token</span></label>
                        <input type="password" name="secret" class="form-control" autocomplete="new-password"
                               placeholder="{{ $hasSecret ? 'A key is set, type to replace it' : 'Not set' }}" />
                        <p class="text-muted small">
                            Leave blank to keep the key you already have. It is stored on the panel and never sent to a
                            browser. Only the answers it fetches are.
                        </p>
                        <p class="text-muted small" data-billing="paymenter">
                            Paymenter needs a key with <code>services:read</code> and <code>invoices:read</code>.
                        </p>
                        <p class="text-muted small" data-billing="whmcs">
                            WHMCS needs <code>GetClientsProducts</code>, <code>GetInvoices</code> and
                            <code>GetInvoice</code>, and the panel's IP on the API allowlist.
                        </p>
                        <p class="text-muted small" data-billing="dezerx">
                            Spartan needs a token with the <code>services.show</code> permission. Requests go to
                            <code>/api/application/services/{id}</code>.
                        </p>
                    </div>
                </div>

                <div class="box-footer">
                    {!! csrf_field() !!}
                    <button type="submit" class="btn btn-primary pull-right">Save</button>
                </div>
            </div>

            <div class="box">
                <div class="box-header with-border"><h3 class="box-title">Due date notices</h3></div>

                <div class="box-body">
                    <div class="form-group">
                        <label class="control-label">Warn this many days ahead</label>
                        <input type="number" name="warn_days" class="form-control" min="0" max="120"
                               value="{{ old('warn_days', $settings['warn_days']) }}" />
                        <p class="text-muted small">
                            A service due within this many days shows an amber notice on its Overview page. Past the due
                            date the notice turns red instead. <code>0</code> shows only the red one.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Amber notice text</label>
                        <input type="text" name="warn_text" class="form-control" maxlength="200"
                               placeholder="Leave blank for the panel's own wording"
                               value="{{ old('warn_text', $settings['warn_text']) }}" />
                        <p class="text-muted small">
                            <code>{days}</code> becomes the number of days left and <code>{date}</code> the due date.
                            Blank uses the panel's own wording, which is translated into every language it ships.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Amber notice description</label>
                        <input type="text" name="warn_body" class="form-control" maxlength="300"
                               placeholder="Leave blank for the panel's own wording"
                               value="{{ old('warn_body', $settings['warn_body']) }}" />
                        <p class="text-muted small">
                            The smaller line under the amber notice. Same <code>{days}</code> and <code>{date}</code>
                            placeholders.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Red notice text</label>
                        <input type="text" name="overdue_text" class="form-control" maxlength="200"
                               placeholder="Leave blank for the panel's own wording"
                               value="{{ old('overdue_text', $settings['overdue_text']) }}" />
                        <p class="text-muted small">Same placeholders; here <code>{days}</code> counts days overdue.</p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Red notice description</label>
                        <input type="text" name="overdue_body" class="form-control" maxlength="300"
                               placeholder="Leave blank for the panel's own wording"
                               value="{{ old('overdue_body', $settings['overdue_body']) }}" />
                        <p class="text-muted small">
                            The smaller line under the red notice. Here <code>{days}</code> counts days overdue.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Where the notice appears</label>
                        @php($global = old('global', $settings['global']))
                        <select name="global" class="form-control">
                            <option value="0">Overview page only</option>
                            <option value="1" @if($global) selected @endif>Every page of the server</option>
                        </select>
                        <p class="text-muted small">
                            With this on, the amber and red notices ride above every page inside a server, not just its
                            Overview, so nobody misses one by going straight to the console.
                        </p>
                    </div>

                    <div class="form-group">
                        <label class="control-label">Preview</label>
                        @php($preview = old('preview', $settings['preview']))
                        <select name="preview" class="form-control">
                            <option value="">Off: show a notice only when really due</option>
                            <option value="due" @if($preview === 'due') selected @endif>Force the amber notice</option>
                            <option value="overdue" @if($preview === 'overdue') selected @endif>Force the red notice</option>
                        </select>
                        <p class="text-muted small">
                            Puts a notice on every server so you can see how it looks.
                            <strong>Customers see it too.</strong> Set this back to Off when you are done.
                        </p>
                    </div>
                </div>

                <div class="box-footer">
                    <button type="submit" class="btn btn-primary pull-right">Save</button>
                </div>
            </div>
        </form>

        @if ($configured)
            <form action="{{ route('admin.dezerx.billing.test') }}" method="POST">
                <div class="box">
                    <div class="box-header with-border"><h3 class="box-title">Test a lookup</h3></div>

                    <div class="box-body">
                        <div class="form-group">
                            <label class="control-label">{{ $settings['provider'] === 'dezerx' ? 'Service ID or server identifier' : 'External ID' }}</label>
                            <input type="text" name="external_id" class="form-control" required
                                   placeholder="{{ $settings['provider'] === 'dezerx' ? 'A service ID, or a server identifier such as 6f3cc88c' : 'The service ID stored on one of your servers' }}" />
                            <p class="text-muted small">
                                Asks {{ ['paymenter' => 'Paymenter', 'whmcs' => 'WHMCS', 'dezerx' => 'KTS Host Billing'][$settings['provider']] }}
                                about this service and reports what came back. Bypasses the cache.
                            </p>
                        </div>
                    </div>

                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-default pull-right">Run test</button>
                    </div>
                </div>
            </form>
        @endif
    </div>

    <div class="col-sm-5">
        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">How servers are matched</h3></div>

            <div class="box-body">
                @if ($settings['provider'] === 'dezerx')
                    <p>
                        A server is matched by its <strong>external ID</strong> when it has one. Spartan's API is
                        keyed on the service's own ID, which this panel has no way of knowing, so a server without
                        an external ID is matched instead by its <strong>identifier</strong>: the eight characters
                        Spartan records against the service it provisioned. Nothing else is sent.
                    </p>

                    <p>
                        <strong>{{ $linked }}</strong> of <strong>{{ $total }}</strong>
                        {{ $total === 1 ? 'server carries' : 'servers carry' }} an external ID; the rest are looked
                        up by identifier.
                    </p>
                @else
                    <p>
                        Each server is matched to a service by its <strong>external ID</strong>, the field your billing
                        panel fills in when it creates the server. Nothing else is sent.
                    </p>

                    <p>
                        <strong>{{ $linked }}</strong> of <strong>{{ $total }}</strong>
                        {{ $total === 1 ? 'server carries' : 'servers carry' }} an external ID.
                    </p>

                    @if ($linked === 0)
                        <div class="alert alert-warning no-margin">
                            No server has an external ID, so every lookup will come back empty. Servers created
                            through Paymenter or WHMCS get one automatically; older servers can be given one from
                            <em>Servers &rarr; Manage</em>.
                        </div>
                    @endif
                @endif
            </div>
        </div>

        <div class="box">
            <div class="box-header with-border"><h3 class="box-title">Caching</h3></div>

            <div class="box-body">
                <p class="no-margin">
                    Answers are cached for five minutes per service, so opening the Overview page repeatedly does not
                    hammer your billing panel. A paid invoice can therefore take up to five minutes to disappear.
                </p>
            </div>
        </div>
    </div>
</div>
@endsection

@section('footer-scripts')
    @parent

    <script>
        $(document).ready(function () {
            function toggleBillingFields() {
                var provider = $('#pBillingProvider').val();

                $('[data-billing]').each(function () {
                    $(this).toggle($(this).data('billing') === provider);
                });

                $('[data-billing-label]').each(function () {
                    $(this).toggle($(this).data('billing-label') === provider);
                });
            }

            $('#pBillingProvider').on('change', toggleBillingFields);
            toggleBillingFields();
        });
    </script>
@endsection
