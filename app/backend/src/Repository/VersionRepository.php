<?php

namespace App\Repository;

use App\Entity\Library;
use App\Entity\Version;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class VersionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Version::class);
    }

    public function findLatestSemver(Library $library): ?Version
    {
        return $this->createQueryBuilder('v')
            ->andWhere('v.library = :library')
            ->setParameter('library', $library->getId())
            ->orderBy('v.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
