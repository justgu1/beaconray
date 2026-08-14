<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\Provider\HandshakeProvider;

#[ApiResource(
    operations: [
        new Get(uriTemplate: '/v1/cli/handshake', provider: HandshakeProvider::class),
    ],
)]
class Handshake
{
    public function __construct(
        public readonly string $protocolVersion,
        public readonly string $identifier,
        public readonly array $scopes,
    ) {
    }
}
