<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RegistroLog;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function index(Request $request)
    {
        if ($request->attributes->get('authTipo') !== 'usuario') {
            return response()->json([
                'message' => 'A listagem de logs exige o token do usuário',
            ], 403);
        }

        $usuarioId = (int) $request->attributes->get('usuarioId');

        $logs = RegistroLog::query()
            ->where('usuario_id', $usuarioId)
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (RegistroLog $log) => $log->paraApi())
            ->values();

        return response()->json(['data' => $logs]);
    }

    public function store(Request $request)
    {
        $dados = $request->validate([
            'acao' => ['required', 'string', 'max:100'],
            'detalhe' => ['nullable', 'string'],
            'tarefaId' => ['nullable', 'integer'],
            'usuarioId' => ['nullable', 'integer'],
        ]);

        $comoServico = $request->attributes->get('authTipo') === 'servico';
        $usuarioId = $comoServico
            ? ($dados['usuarioId'] ?? null)
            : (int) $request->attributes->get('usuarioId');

        if (! $comoServico && array_key_exists('usuarioId', $dados) && $dados['usuarioId'] !== null && (int) $dados['usuarioId'] !== $usuarioId) {
            RegistroLog::query()->create([
                'acao' => 'ACESSO_INDEVIDO',
                'detalhe' => "Usuário {$usuarioId} tentou registrar log para o usuário {$dados['usuarioId']}",
                'usuario_id' => $usuarioId,
                'tarefa_id' => $dados['tarefaId'] ?? null,
            ]);

            return response()->json([
                'message' => 'Não é permitido registrar logs para outro usuário',
            ], 403);
        }

        $registro = RegistroLog::query()->create([
            'acao' => $dados['acao'],
            'detalhe' => $dados['detalhe'] ?? null,
            'usuario_id' => $usuarioId,
            'tarefa_id' => $dados['tarefaId'] ?? null,
        ]);

        return response()->json($registro->paraApi(), 201);
    }
}
