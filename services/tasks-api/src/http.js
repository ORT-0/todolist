export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function usuarioPublico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
}

export function formatarTarefa(tarefa) {
  return {
    id: tarefa.id,
    titulo: tarefa.titulo,
    descricao: tarefa.descricao,
    concluida: tarefa.concluida,
    usuarioId: tarefa.usuarioId,
    title: tarefa.titulo,
    description: tarefa.descricao,
    completed: tarefa.concluida,
  };
}
