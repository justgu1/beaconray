<?php

namespace App\Storage;

use Aws\S3\S3Client;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class MinioArtifactStorage implements ArtifactStorageInterface
{
    private S3Client $client;

    public function __construct(
        #[Autowire(env: 'MINIO_ENDPOINT')] string $endpoint,
        #[Autowire(env: 'MINIO_REGION')] string $region,
        #[Autowire(env: 'MINIO_ACCESS_KEY')] string $accessKey,
        #[Autowire(env: 'MINIO_SECRET_KEY')] string $secretKey,
        #[Autowire(env: 'bool:MINIO_USE_PATH_STYLE')] bool $usePathStyle,
        #[Autowire(env: 'MINIO_BUCKET')] private readonly string $bucket,
        #[Autowire(env: 'int:ARTIFACT_PRESIGN_TTL')] private readonly int $defaultTtlSeconds,
    ) {
        $this->client = new S3Client([
            'version' => 'latest',
            'region' => $region,
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => $usePathStyle,
            'credentials' => [
                'key' => $accessKey,
                'secret' => $secretKey,
            ],
        ]);
    }

    public function putArtifact(string $objectKey, string $localPath): void
    {
        $this->client->putObject([
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
            'SourceFile' => $localPath,
        ]);
    }

    public function getPresignedDownloadUrl(string $objectKey, ?int $expiresInSeconds = null): string
    {
        $command = $this->client->getCommand('GetObject', [
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
        ]);

        return (string) $this->client
            ->createPresignedRequest($command, "+{$this->ttl($expiresInSeconds)} seconds")
            ->getUri();
    }

    public function getPresignedUploadUrl(string $objectKey, ?int $expiresInSeconds = null): string
    {
        $command = $this->client->getCommand('PutObject', [
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
        ]);

        return (string) $this->client
            ->createPresignedRequest($command, "+{$this->ttl($expiresInSeconds)} seconds")
            ->getUri();
    }

    public function deleteArtifact(string $objectKey): void
    {
        $this->client->deleteObject([
            'Bucket' => $this->bucket,
            'Key' => $objectKey,
        ]);
    }

    private function ttl(?int $expiresInSeconds): int
    {
        return $expiresInSeconds ?? $this->defaultTtlSeconds;
    }
}
