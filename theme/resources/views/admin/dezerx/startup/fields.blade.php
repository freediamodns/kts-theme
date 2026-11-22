<div class="box-body">
    <div class="row">
        <div class="col-sm-6 form-group">
            <label class="control-label">Name</label>
            <input type="text" name="label" class="form-control" maxlength="60" required
                   value="{{ $preset['label'] ?? '' }}" placeholder="Aikar's flags">
            <p class="small dz-hint">What the card says in the Startup tab.</p>
        </div>

        <div class="col-sm-6 form-group">
            <label class="control-label">Description</label>
            <input type="text" name="description" class="form-control" maxlength="200"
                   value="{{ $preset['description'] ?? '' }}" placeholder="Tuned garbage collection for 4 GB and up.">
            <p class="small dz-hint">One line under the name. Optional.</p>
        </div>
    </div>

    <div class="form-group">
        <label class="control-label">Command</label>
        <textarea name="command" class="form-control" rows="3" maxlength="2000" required>{{ $preset['command'] ?? '' }}</textarea>
        <p class="small dz-hint">
            Exactly what the egg would carry, variables and all: <code>@{{SERVER_MEMORY}}</code>,
            <code>@{{SERVER_JARFILE}}</code> and the rest are filled in by the panel when the server starts.
        </p>
    </div>

    <div class="row">
        <div class="col-sm-8 form-group">
            <label class="control-label">Eggs</label>
            <select name="eggs[]" class="form-control dz-eggs" multiple>
                @foreach ($nests as $nest)
                    <optgroup label="{{ $nest->name }}">
                        @foreach ($nest->eggs as $egg)
                            <option value="{{ $egg->uuid }}"
                                @if (in_array($egg->uuid, $preset['eggs'] ?? [], true)) selected @endif>
                                {{ $egg->name }}
                            </option>
                        @endforeach
                    </optgroup>
                @endforeach
            </select>
            <p class="small dz-hint">
                Which servers are offered this. Hold ctrl or cmd to pick more than one. A command with no eggs is
                stored and shown to nobody.
            </p>
        </div>

        <div class="col-sm-4 form-group">
            <label class="control-label">Offered</label>
            <select name="enabled" class="form-control">
                <option value="1" @if (($preset['enabled'] ?? true)) selected @endif>Yes, show it</option>
                <option value="0" @if (isset($preset) && ! $preset['enabled']) selected @endif>No, keep it hidden</option>
            </select>
            <p class="small dz-hint">Off keeps the command here without offering it to anybody.</p>
        </div>
    </div>
</div>
