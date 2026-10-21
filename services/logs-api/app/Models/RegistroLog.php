<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistroLog extends Model
{
    protected $table = 'registros_logs';

    protected $fillable = [
        'acao',
        'detalhe',
        'usuario_id',
        'tarefa_id',
    ];

    public function paraApi(): array
    {
        return [
            'id' => $this->id,
            'acao' => $this->acao,
            'detalhe' => $this->detalhe,
            'usuarioId' => $this->usuario_id,
            'tarefaId' => $this->tarefa_id,
            'timestamp' => $this->created_at?->toIso8601String(),
        ];
    }
}
