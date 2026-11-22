
@php
    $starkImage = $logo['mode'] !== 'text' && $logo['image'] !== '';
    $starkText = ! $starkImage || $logo['mode'] === 'both';
@endphp
<span class="stark-logo">
    @if ($starkImage)
        <img src="{{ $logo['image'] }}" alt="{{ $logo['alt'] }}" class="stark-logo-dark">
        <img src="{{ $logo['imageLight'] }}" alt="{{ $logo['alt'] }}" class="stark-logo-light">
    @endif
    @if ($starkText)
        <span>{{ $logo['text'] }}</span>
    @endif
</span>
@if ($logo['mark'])
    <img src="{{ $logo['mark'] }}" alt="{{ $logo['alt'] }}" class="stark-logo-mark">
@endif
