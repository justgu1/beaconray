<?php

namespace App\Validator;

use Opis\JsonSchema\Errors\ErrorFormatter;
use Opis\JsonSchema\Validator as JsonSchemaValidator;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class AstSchemaValidator extends ConstraintValidator
{
    public function __construct(
        #[Autowire('%kernel.project_dir%/../../.specs/schemas/component-ast.schema.json')]
        private readonly string $schemaPath,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof AstSchema) {
            throw new UnexpectedTypeException($constraint, AstSchema::class);
        }

        if (null === $value) {
            return;
        }

        if (!is_array($value)) {
            throw new UnexpectedTypeException($value, 'array');
        }

        $data = json_decode(json_encode($value));
        $schema = json_decode(file_get_contents($this->schemaPath));

        $validator = new JsonSchemaValidator();
        $result = $validator->validate($data, $schema);

        if ($result->isValid()) {
            return;
        }

        $formatter = new ErrorFormatter();
        $error = $formatter->formatKeyed($result->error());
        $flat = implode('; ', array_map(
            static fn (array $messages, string $path): string => "{$path}: " . implode(', ', $messages),
            $error,
            array_keys($error),
        ));

        $this->context->buildViolation($constraint->message)
            ->setParameter('{{ error }}', $flat)
            ->addViolation();
    }
}
