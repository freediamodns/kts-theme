@php($dzAutoEnabled = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::enabled())

@if ($dzAutoEnabled)
    @php($dzAuto = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::forServer($server))
    @php($dzAutoZone = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::timezone())
    @php($dzAutoDue = $dzAuto?->isPending() ? $dzAuto->due_at : \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::suggestedDueAt())
    @php($dzAutoAction = $dzAuto?->action ?? \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::defaultAction())

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-warning">
                <div class="box-header with-border">
                    <h3 class="box-title">Auto Action</h3>
                </div>

                <form action="{{ route('admin.servers.view.manage.autoaction', $server->id) }}" method="POST">
                    <div class="box-body">
                        @if ($dzAuto && ! $dzAuto->isPending())
                            <div class="alert alert-info">
                                This server's auto action has already run:
                                <strong>{{ \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::label($dzAuto->action) }}</strong>,
                                {{ $dzAuto->outcome ?? 'outcome unknown' }},
                                on {{ $dzAuto->processed_at?->setTimezone($dzAutoZone)->format('D j M Y, H:i') }}.
                                @if ($dzAuto->failure)
                                    <br>Last error: <code>{{ $dzAuto->failure }}</code>
                                @endif
                                <br>Saving below schedules a fresh one.
                            </div>
                        @elseif ($dzAuto && $dzAuto->due_at?->isPast())
                            <div class="alert alert-warning">
                                This due date has already passed. The scheduler will act on it the next time it runs.
                                @if ($dzAuto->attempts > 0)
                                    It has failed {{ $dzAuto->attempts }} time(s) so far:
                                    <code>{{ $dzAuto->failure }}</code>
                                @endif
                            </div>
                        @endif

                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="pAutoActionDue" class="control-label">Due date</label>
                                    <input type="datetime-local" class="form-control" id="pAutoActionDue" name="due_at"
                                           value="{{ \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::formatForInput($dzAutoDue) }}">
                                    <p class="text-muted small">
                                        Read in the panel's timezone, <code>{{ $dzAutoZone }}</code>. Clearing this
                                        field and saving removes the schedule.
                                    </p>
                                </div>
                            </div>

                            <div class="col-md-6">
                                <div class="form-group">
                                    <label for="pAutoActionWhat" class="control-label">What happens then</label>
                                    <select id="pAutoActionWhat" name="action" class="form-control">
                                        @foreach (\Pterodactyl\Services\Dezerx\AutoAction\AutoActions::ACTIONS as $dzValue => $dzLabel)
                                            <option value="{{ $dzValue }}" @if ($dzAutoAction === $dzValue) selected @endif>
                                                {{ $dzLabel }}
                                            </option>
                                        @endforeach
                                    </select>
                                    <p class="text-muted small">
                                        {{ \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::ACTION_HINTS[$dzAutoAction] ?? '' }}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="box-footer">
                        {!! csrf_field() !!}
                        <button type="submit" class="btn btn-sm btn-primary">Save Auto Action</button>

                        @if ($dzAuto)
                            <button type="submit" name="clear" value="1" class="btn btn-sm btn-default pull-right">
                                Remove
                            </button>
                        @endif
                    </div>
                </form>
            </div>
        </div>
    </div>
@endif
