<?php

namespace App\State\Provider;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\Handshake;
use Symfony\Bundle\SecurityBundle\Security;

class HandshakeProvider implements ProviderInterface
{
    private const PROTOCOL_VERSION = '1.0';

    public function __construct(private readonly Security $security)
    {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): Handshake
    {
        // getUserIdentifier() works for both a real App\Entity\User (email,
        // authorization_code/device_code grants) and league/oauth2-server-bundle's
        // ClientCredentialsUser (client identifier, client_credentials grant —
        // no human user involved, e.g. a CI pipeline authenticating as itself).
        $identifier = $this->security->getUser()?->getUserIdentifier() ?? 'unknown';

        $scopes = array_values(array_filter(array_map(
            static fn (string $role): ?string => str_starts_with($role, 'ROLE_OAUTH2_')
                ? strtolower(substr($role, strlen('ROLE_OAUTH2_')))
                : null,
            $this->security->getToken()?->getRoleNames() ?? [],
        )));

        return new Handshake(
            protocolVersion: self::PROTOCOL_VERSION,
            identifier: $identifier,
            scopes: $scopes,
        );
    }
}
