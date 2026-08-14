<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiProperty;
use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\LibraryRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Attribute\Ignore;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: LibraryRepository::class)]
#[ORM\Table(name: 'libraries')]
#[ORM\UniqueConstraint(name: 'uniq_library_user_slug', columns: ['user_id', 'slug'])]
#[ApiResource(
    operations: [
        new GetCollection(uriTemplate: '/v1/cli/components'),
        new Get(uriTemplate: '/v1/cli/components/{slug}'),
    ],
    paginationEnabled: true,
)]
class Library
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    #[ApiProperty(identifier: false)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false)]
    #[Ignore]
    private User $user;

    #[ORM\Column(length: 255)]
    #[ApiProperty(identifier: true)]
    private string $slug;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $metadata = [];

    #[ORM\OneToMany(targetEntity: Version::class, mappedBy: 'library')]
    #[Ignore]
    private Collection $versions;

    #[ORM\ManyToOne(targetEntity: Version::class)]
    #[ORM\JoinColumn(name: 'current_version_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    #[Ignore]
    private ?Version $currentVersion = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(User $user, string $slug, string $name)
    {
        $this->id = Uuid::v4();
        $this->user = $user;
        $this->slug = $slug;
        $this->name = $name;
        $this->versions = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getUser(): User
    {
        return $this->user;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): void
    {
        $this->description = $description;
        $this->touch();
    }

    public function getMetadata(): array
    {
        return $this->metadata;
    }

    public function setMetadata(array $metadata): void
    {
        $this->metadata = $metadata;
        $this->touch();
    }

    public function getVersions(): Collection
    {
        return $this->versions;
    }

    public function getCurrentVersion(): ?Version
    {
        return $this->currentVersion;
    }

    public function getCurrentVersionSemver(): ?string
    {
        return $this->currentVersion?->getSemver();
    }

    public function setCurrentVersion(Version $version): void
    {
        if ($version->getLibrary() !== $this) {
            throw new \DomainException('Version does not belong to this library.');
        }
        if ($version->getCompileStatus() !== CompileStatus::Compiled) {
            throw new \DomainException('Only a compiled version can become current.');
        }
        $this->currentVersion = $version;
        $this->touch();
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    private function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
