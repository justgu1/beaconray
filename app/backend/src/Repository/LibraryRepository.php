<?php

namespace App\Repository;

use App\Entity\Library;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class LibraryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Library::class);
    }

    public function findOneBySlugAndUser(string $slug, string $userId): ?Library
    {
        return $this->createQueryBuilder('l')
            ->andWhere('l.slug = :slug')
            ->andWhere('l.user = :userId')
            ->setParameter('slug', $slug)
            ->setParameter('userId', $userId)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
