<?php

namespace App\Entity;

use App\Repository\VersionRepository;
use App\Validator\AstSchema;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: VersionRepository::class)]
#[ORM\Table(name: 'versions')]
#[ORM\UniqueConstraint(name: 'uniq_version_library_semver', columns: ['library_id', 'semver'])]
class Version
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: Library::class, inversedBy: 'versions')]
    #[ORM\JoinColumn(nullable: false)]
    private Library $library;

    #[ORM\Column(length: 64)]
    private string $semver;

    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    #[AstSchema]
    private array $ast;

    #[ORM\Column(length: 20, enumType: CompileStatus::class)]
    private CompileStatus $compileStatus = CompileStatus::Pending;

    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $artifactPaths = [];

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $compiledAt = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(Library $library, string $semver, array $ast)
    {
        $this->id = Uuid::v4();
        $this->library = $library;
        $this->semver = $semver;
        $this->ast = $ast;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getLibrary(): Library
    {
        return $this->library;
    }

    public function getSemver(): string
    {
        return $this->semver;
    }

    public function getAst(): array
    {
        return $this->ast;
    }

    public function getCompileStatus(): CompileStatus
    {
        return $this->compileStatus;
    }

    public function markCompiling(): void
    {
        $this->compileStatus = CompileStatus::Compiling;
    }

    public function markCompiled(array $artifactPaths): void
    {
        $this->compileStatus = CompileStatus::Compiled;
        $this->artifactPaths = $artifactPaths;
        $this->compiledAt = new \DateTimeImmutable();
    }

    public function markFailed(): void
    {
        $this->compileStatus = CompileStatus::Failed;
    }

    public function getArtifactPaths(): array
    {
        return $this->artifactPaths;
    }

    public function getCompiledAt(): ?\DateTimeImmutable
    {
        return $this->compiledAt;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
