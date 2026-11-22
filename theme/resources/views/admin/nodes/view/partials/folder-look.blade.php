

@php
    use Pterodactyl\Services\Dezerx\Allocations\AllocationFolders;

    $lookIcon = $look['icon'] ?? '';
    $lookColor = $look['color'] ?? '';
    $lookImage = $look['image'] ?? '';
    $lookNote = $look['note'] ?? '';

    $icons = AllocationFolders::ICONS;
    $colors = AllocationFolders::COLORS;

    if ($lookIcon !== '' && ! in_array($lookIcon, $icons, true)) {
        $icons[] = $lookIcon;
    }

    if ($lookColor !== '' && ! in_array($lookColor, $colors, true)) {
        $colors[] = $lookColor;
    }

    $shipped = \Pterodactyl\Services\Dezerx\Allocations\EggArtwork::shipped();
@endphp

<div class="form-group">
    <label class="control-label">Icon</label>
    <div class="dz-picker">
        @foreach ($icons as $icon)
            <label @class(['dz-pick', 'active' => $lookIcon === $icon])>
                <input type="radio" name="icon" value="{{ $icon }}" @if ($lookIcon === $icon) checked @endif>
                <i class="fa {{ $icon }}"></i>
            </label>
        @endforeach
    </div>
</div>

<div class="form-group">
    <label class="control-label">Colour</label>
    <div class="dz-picker">
        @foreach ($colors as $color)
            <label @class(['dz-swatch', 'active' => $lookColor === $color, 'dz-swatch-none' => $color === ''])
                   style="{{ $color === '' ? '' : 'background: ' . $color }}" title="{{ $color === '' ? 'No colour' : $color }}">
                <input type="radio" name="color" value="{{ $color }}" @if ($lookColor === $color) checked @endif>
            </label>
        @endforeach
    </div>
</div>

<div class="form-group">
    <label class="control-label">Picture <small class="text-muted">instead of the icon</small></label>

    <div class="dz-artpick">
        <span @class(['dz-art', 'active' => $lookImage === '']) data-image="" title="No picture, use the icon">
            <i class="fa fa-ban"></i>
        </span>

        @foreach ($shipped as $art)
            <span @class(['dz-art', 'active' => $lookImage === $art]) data-image="{{ $art }}">
                <img src="{{ $art }}" alt="" loading="lazy">
            </span>
        @endforeach
    </div>

    <input type="text" class="form-control dz-art-url" name="image" maxlength="300" autocomplete="off"
           value="{{ $lookImage }}" placeholder="...or paste any image URL">

    <p class="text-muted small no-margin" style="margin-top: 4px;">
        The artwork this theme ships with, or anything else you can link to. Leave it blank for the icon.
    </p>
</div>

<div class="form-group no-margin">
    <label class="control-label">Note to yourself</label>
    <textarea class="form-control" name="note" rows="2" maxlength="240"
              placeholder="What this folder is for, who it is reserved for, anything you will have forgotten in a month.">{{ $lookNote }}</textarea>
</div>
