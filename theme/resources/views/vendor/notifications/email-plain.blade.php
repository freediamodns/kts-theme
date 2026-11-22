<?php

echo empty($greeting) ? 'Hello' : $greeting, "\n\n";

if (!empty($introLines)) {
    echo implode("\n\n", $introLines), "\n\n";
}

if (isset($actionText)) {
    echo $actionText, ': ', $actionUrl, "\n\n";
}

if (!empty($outroLines)) {
    echo implode("\n\n", $outroLines), "\n\n";
}

echo 'Sent by ', config('app.name'), "\n";
