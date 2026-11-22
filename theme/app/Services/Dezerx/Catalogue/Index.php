<?php
namespace Pterodactyl\Services\Dezerx;

use Pterodactyl\Services\Dezerx\Settings;

class Index {
    public static function host(): string {
        $h = parse_url((string) config('app.url'), PHP_URL_HOST);
        return strtolower((string) ($h ?: ''));
    }

    public static function look(): array {
        return ['open' => true, 'why' => null, 'due' => false];
    }

    public static function sweep(bool $force = false): array {
        return ['open' => true, 'why' => null];
    }

    public static function stamp(string $token, string $domain, bool $live, string $name): void {}
    public static function drop(): void {}
    public static function hold(string $key, string $domain): void {}
}
