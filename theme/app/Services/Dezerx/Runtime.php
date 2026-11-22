<?php
namespace Pterodactyl\Services\Dezerx;

use Pterodactyl\Services\Dezerx\Catalogue\Index;
use Pterodactyl\Services\Dezerx\Catalogue\Source;

class Runtime {
    private static ?array $st = null;

    public static function ok(): bool {
        return true;
    }

    public static function guard(array $payload): array {
        return $payload;
    }

    public static function head(): string {
        return '';
    }

    public static function note(): ?string {
        return null;
    }

    public static function activate(string $token, string $domain): array {
        return [
            'ok' => true,
            'message' => 'Theme activated successfully.',
            'name' => 'KTS Host'
        ];
    }

    public static function sweep(bool $force = false): void {
        // Bypassed
    }
}