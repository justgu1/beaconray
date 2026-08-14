<?php

namespace App\Entity;

enum CompileStatus: string
{
    case Pending = 'pending';
    case Compiling = 'compiling';
    case Compiled = 'compiled';
    case Failed = 'failed';
}
