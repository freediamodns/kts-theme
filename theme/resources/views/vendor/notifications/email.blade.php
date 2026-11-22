
{!! \Pterodactyl\Services\Dezerx\Emails::document([
    'key' => $dezerxEmail ?? '',
    'values' => $dezerxValues ?? [],
    'subject' => $subject ?? ($subjectLine ?? ''),
    'greeting' => $greeting ?? '',
    'introLines' => $introLines ?? [],
    'actionText' => $actionText ?? '',
    'actionUrl' => $actionUrl ?? '',
    'outroLines' => $outroLines ?? [],
]) !!}
