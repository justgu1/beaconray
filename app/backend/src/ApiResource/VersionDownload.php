<?php

namespace App\ApiResource;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use App\State\Provider\VersionDownloadProvider;

#[ApiResource(
    operations: [
        new Get(
            uriTemplate: '/v1/cli/components/{slug}/versions/{semver}/download',
            uriVariables: ['slug', 'semver'],
            provider: VersionDownloadProvider::class,
        ),
    ],
)]
class VersionDownload
{
    public function __construct(
        public readonly string $target,
        public readonly string $url,
        public readonly int $expiresInSeconds,
    ) {
    }
}
