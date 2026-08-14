<?php

namespace App\Message;

class CompileVersionMessage
{
    public function __construct(private readonly string $versionId)
    {
    }

    public function getVersionId(): string
    {
        return $this->versionId;
    }
}
