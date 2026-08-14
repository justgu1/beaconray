<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

#[\Attribute(\Attribute::TARGET_PROPERTY)]
class AstSchema extends Constraint
{
    public string $message = 'Invalid component AST: {{ error }}';

    public function validatedBy(): string
    {
        return AstSchemaValidator::class;
    }
}
