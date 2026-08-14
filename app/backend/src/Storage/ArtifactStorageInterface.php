<?php

namespace App\Storage;

interface ArtifactStorageInterface
{
    public function putArtifact(string $objectKey, string $localPath): void;

    public function getPresignedDownloadUrl(string $objectKey, ?int $expiresInSeconds = null): string;

    public function getPresignedUploadUrl(string $objectKey, ?int $expiresInSeconds = null): string;

    public function deleteArtifact(string $objectKey): void;
}
