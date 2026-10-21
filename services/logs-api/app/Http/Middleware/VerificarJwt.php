<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class VerificarJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $chaveServico = (string) $request->header('X-Service-Key', '');
        $chaveConfigurada = (string) config('services.internal.key');

        if ($chaveServico !== '' && $chaveConfigurada !== '' && hash_equals($chaveConfigurada, $chaveServico)) {
            $request->attributes->set('authTipo', 'servico');
            $request->attributes->set('usuarioId', $request->input('usuarioId'));

            return $next($request);
        }

        $token = $request->bearerToken();
        if (! $token) {
            return response()->json(['message' => 'Não autenticado'], 401);
        }

        try {
            $payload = JWT::decode($token, new Key((string) config('services.jwt.secret'), 'HS256'));
        } catch (Throwable) {
            return response()->json(['message' => 'Token inválido ou expirado'], 401);
        }

        if (! isset($payload->sub)) {
            return response()->json(['message' => 'Token inválido'], 401);
        }

        $request->attributes->set('authTipo', 'usuario');
        $request->attributes->set('usuarioId', (int) $payload->sub);

        return $next($request);
    }
}
