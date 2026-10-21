<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_logs', function (Blueprint $table) {
            $table->id();
            $table->string('acao');
            $table->text('detalhe')->nullable();
            $table->unsignedBigInteger('usuario_id')->nullable()->index();
            $table->unsignedBigInteger('tarefa_id')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_logs');
    }
};
