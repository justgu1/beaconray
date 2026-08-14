<?php

namespace App\State\Provider;

use ApiPlatform\Metadata\Exception\NotFoundException;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\ApiResource\VersionDownload;
use App\Entity\CompileStatus;
use App\Repository\LibraryRepository;
use App\Storage\ArtifactStorageInterface;
use Symfony\Component\HttpFoundation\RequestStack;

class VersionDownloadProvider implements ProviderInterface
{
    private const DEFAULT_TARGET = 'react';

    public function __construct(
        private readonly LibraryRepository $libraries,
        private readonly ArtifactStorageInterface $storage,
        private readonly RequestStack $requestStack,
    ) {
    }

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): VersionDownload
    {
        $library = $this->libraries->findOneBy(['slug' => $uriVariables['slug']]);
        if (!$library) {
            throw new NotFoundException('Component not found.');
        }

        $version = null;
        foreach ($library->getVersions() as $candidate) {
            if ($candidate->getSemver() === $uriVariables['semver']) {
                $version = $candidate;
                break;
            }
        }

        if (!$version || $version->getCompileStatus() !== CompileStatus::Compiled) {
            throw new NotFoundException('Version not found or not compiled yet.');
        }

        $target = $this->requestStack->getCurrentRequest()?->query->get('target', self::DEFAULT_TARGET);
        $objectKey = $version->getArtifactPaths()[$target] ?? null;
        if (!$objectKey) {
            throw new NotFoundException("No compiled artifact for target \"{$target}\".");
        }

        $expiresIn = 180;

        return new VersionDownload(
            target: $target,
            url: $this->storage->getPresignedDownloadUrl($objectKey, $expiresIn),
            expiresInSeconds: $expiresIn,
        );
    }
}
