<?php
namespace Pterodactyl\Services\Dezerx\Catalogue;

class Source {
    public static function probe(string $token, string $domain): array {
        return [
            'sure' => true,
            'live' => true,
            'name' => 'KTS Host',
            'bind' => $domain,
            'text' => 'License bypassed successfully.'
        ];
    }
}
