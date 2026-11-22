<select class="form-control er-select" form="{{ $form }}" name="{{ $name }}" multiple>
    @foreach ($nests as $nest)
        @if (! $nest->eggs->isEmpty())
            <optgroup label="{{ $nest->name }}">
                @foreach ($nest->eggs as $egg)
                    <option value="{{ $egg->uuid }}" @if (in_array($egg->uuid, $selected, true)) selected @endif>{{ $egg->name }}</option>
                @endforeach
            </optgroup>
        @endif
    @endforeach
</select>
