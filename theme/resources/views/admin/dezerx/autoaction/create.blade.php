@php($dzAutoEnabled = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::enabled())

@if ($dzAutoEnabled)
    @php($dzAutoSuggested = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::suggestedDueAt())
    @php($dzAutoDefault = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::defaultAction())
    @php($dzAutoZone = \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::timezone())

    <div class="row">
        <div class="col-xs-12">
            <div class="box box-warning">
                <div class="box-header with-border">
                    <h3 class="box-title">Auto Action</h3>
                </div>

                <div class="box-body row">
                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="pAutoActionDue">Due date</label>
                            <input type="datetime-local" class="form-control" id="pAutoActionDue"
                                   name="auto_action[due_at]"
                                   value="{{ old('auto_action.due_at', \Pterodactyl\Services\Dezerx\AutoAction\AutoActions::formatForInput($dzAutoSuggested)) }}">
                            <p class="small text-muted no-margin">
                                Leave this empty and nothing is scheduled. Times are read in the panel's own
                                timezone, <code>{{ $dzAutoZone }}</code>.
                            </p>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="form-group">
                            <label for="pAutoActionWhat">What happens then</label>
                            <select id="pAutoActionWhat" name="auto_action[action]" class="form-control">
                                @foreach (\Pterodactyl\Services\Dezerx\AutoAction\AutoActions::ACTIONS as $dzValue => $dzLabel)
                                    <option value="{{ $dzValue }}"
                                        @if (old('auto_action.action', $dzAutoDefault) === $dzValue) selected @endif>
                                        {{ $dzLabel }}
                                    </option>
                                @endforeach
                            </select>
                            <p class="small text-muted no-margin">
                                Runs once, on the panel's scheduler. A deletion cannot be undone, so pick suspension
                                unless you mean it.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
@endif
