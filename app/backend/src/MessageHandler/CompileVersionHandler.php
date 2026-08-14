<?php

namespace App\MessageHandler;

use App\Message\CompileVersionMessage;
use App\Repository\VersionRepository;
use App\Storage\ArtifactStorageInterface;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;
use Symfony\Component\Messenger\Exception\UnrecoverableMessageHandlingException;
use Symfony\Component\Process\Process;

#[AsMessageHandler]
class CompileVersionHandler
{
    private const TARGETS = [
        'react' => 'react/%s.tsx',
        'vue' => 'vue/%s.vue',
        'astro' => 'astro/%s.astro',
        'qa' => 'qa/%s.html',
        'mitosis' => '%s.lite.tsx',
    ];

    public function __construct(
        private readonly VersionRepository $versions,
        private readonly ArtifactStorageInterface $storage,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(COMPILER_PATH)%')] private readonly string $compilerPath,
    ) {
    }

    public function __invoke(CompileVersionMessage $message): void
    {
        $version = $this->versions->find($message->getVersionId());
        if (!$version) {
            $this->logger->warning('CompileVersionMessage for unknown version', ['versionId' => $message->getVersionId()]);
            return;
        }

        $version->markCompiling();
        $this->entityManager->flush();

        $name = $version->getAst()['name'] ?? null;
        if (!$name) {
            $version->markFailed();
            $this->entityManager->flush();
            throw new UnrecoverableMessageHandlingException('AST has no "name" — should have been caught by AstSchema validation.');
        }

        $tmpFile = tempnam(sys_get_temp_dir(), 'ast_') . '.json';
        file_put_contents($tmpFile, json_encode($version->getAst()));

        $compileScript = rtrim($this->compilerPath, '/') . '/dist/compile.js';
        $process = new Process(['node', $compileScript, $tmpFile]);
        $process->setTimeout(60);
        $process->run();
        unlink($tmpFile);

        $stdout = $process->getOutput();
        $stderr = $process->getErrorOutput();

        if (str_contains($stderr, '[abort]')) {
            $version->markFailed();
            $this->entityManager->flush();
            throw new UnrecoverableMessageHandlingException("Compiler aborted: {$stderr}");
        }

        if (!$process->isSuccessful()) {
            $version->markFailed();
            $this->entityManager->flush();
            throw new \RuntimeException("Compiler process failed: " . ($stderr ?: $stdout));
        }

        $artifactPaths = $this->collectAndUploadArtifacts($version->getId()->toRfc4122(), $name);

        $version->markCompiled($artifactPaths);
        $this->entityManager->flush();
    }

    private function collectAndUploadArtifacts(string $versionId, string $name): array
    {
        $outDir = rtrim($this->compilerPath, '/') . "/out/{$name}";
        $artifactPaths = [];

        foreach (self::TARGETS as $target => $relativePathTemplate) {
            $relativePath = sprintf($relativePathTemplate, $name);
            $localPath = "{$outDir}/{$relativePath}";

            if (!is_file($localPath)) {
                continue;
            }

            $objectKey = "versions/{$versionId}/{$relativePath}";
            $this->storage->putArtifact($objectKey, $localPath);
            $artifactPaths[$target] = $objectKey;
        }

        return $artifactPaths;
    }
}
