<?php

namespace App\Entity;

use App\Repository\AuditLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Uid\Uuid;

#[ORM\Entity(repositoryClass: AuditLogRepository::class)]
#[ORM\Table(name: 'audit_logs')]
class AuditLog
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private Uuid $id;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    #[ORM\Column(length: 255)]
    private string $action;

    #[ORM\Column(length: 255)]
    private string $entityType;

    #[ORM\Column(type: 'uuid', nullable: true)]
    private ?Uuid $entityId = null;

    #[ORM\Column(type: Types::JSON, options: ['jsonb' => true])]
    private array $payload = [];

    #[ORM\Column(length: 45, nullable: true)]
    private ?string $ipAddress = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $action, string $entityType, ?User $user = null)
    {
        $this->id = Uuid::v4();
        $this->action = $action;
        $this->entityType = $entityType;
        $this->user = $user;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): Uuid
    {
        return $this->id;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function getAction(): string
    {
        return $this->action;
    }

    public function getEntityType(): string
    {
        return $this->entityType;
    }

    public function getEntityId(): ?Uuid
    {
        return $this->entityId;
    }

    public function setEntityId(?Uuid $entityId): void
    {
        $this->entityId = $entityId;
    }

    public function getPayload(): array
    {
        return $this->payload;
    }

    public function setPayload(array $payload): void
    {
        $this->payload = $payload;
    }

    public function getIpAddress(): ?string
    {
        return $this->ipAddress;
    }

    public function setIpAddress(?string $ipAddress): void
    {
        $this->ipAddress = $ipAddress;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
