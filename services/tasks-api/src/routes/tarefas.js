import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler, formatarTarefa } from "../http.js";
import { autenticar } from "../middleware/auth.js";
import { registrarLog, sincronizarTarefa } from "../services/integracao.js";

export const tarefasRouter = Router();

tarefasRouter.use(autenticar);

function lerTexto(valor) {
  return String(valor ?? "").trim();
}

function lerBooleano(valor, padrao) {
  if (valor == null) return padrao;
  if (typeof valor === "boolean") return valor;
  if (valor === 1 || valor === "1" || valor === "true") return true;
  if (valor === 0 || valor === "0" || valor === "false") return false;
  return padrao;
}

async function buscarTarefaDoUsuario(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(422).json({ message: "Identificador de tarefa inválido" });
    return null;
  }

  const tarefa = await prisma.tarefa.findUnique({ where: { id } });
  if (!tarefa) {
    res.status(404).json({ message: "Tarefa não encontrada" });
    return null;
  }

  if (tarefa.usuarioId !== req.usuario.id) {
    await registrarLog(req.token, {
      acao: "ACESSO_INDEVIDO",
      detalhe: `Usuário ${req.usuario.id} tentou acessar a tarefa ${id} do usuário ${tarefa.usuarioId}`,
      tarefaId: id,
    });
    res.status(403).json({ message: "Você não pode acessar tarefas de outro usuário" });
    return null;
  }

  return tarefa;
}

tarefasRouter.get("/", asyncHandler(async (req, res) => {
  const tarefas = await prisma.tarefa.findMany({
    where: { usuarioId: req.usuario.id },
    orderBy: { id: "desc" },
  });

  return res.json({ data: tarefas.map(formatarTarefa) });
}));

tarefasRouter.post("/", asyncHandler(async (req, res) => {
  if (req.body.usuarioId != null && Number(req.body.usuarioId) !== req.usuario.id) {
    await registrarLog(req.token, {
      acao: "ACESSO_INDEVIDO",
      detalhe: `Usuário ${req.usuario.id} tentou criar tarefa para o usuário ${req.body.usuarioId}`,
    });
    return res.status(403).json({ message: "Não é permitido criar tarefas para outro usuário" });
  }

  const titulo = lerTexto(req.body.titulo ?? req.body.title);
  const descricao = lerTexto(req.body.descricao ?? req.body.description);

  if (!titulo) {
    return res.status(422).json({ message: "Informe o título da tarefa" });
  }
  if (titulo.length > 255) {
    return res.status(422).json({ message: "O título deve ter no máximo 255 caracteres" });
  }

  const tarefa = await prisma.tarefa.create({
    data: {
      titulo,
      descricao,
      usuarioId: req.usuario.id,
    },
  });

  await sincronizarTarefa(req.token, tarefa);
  await registrarLog(req.token, {
    acao: "CRIACAO",
    detalhe: `Tarefa criada: ${tarefa.titulo}`,
    tarefaId: tarefa.id,
  });

  return res.status(201).json({ data: formatarTarefa(tarefa) });
}));

tarefasRouter.put("/:id", asyncHandler(async (req, res) => {
  const atual = await buscarTarefaDoUsuario(req, res);
  if (!atual) return;

  const titulo = req.body.titulo != null || req.body.title != null
    ? lerTexto(req.body.titulo ?? req.body.title)
    : atual.titulo;
  const descricao = req.body.descricao != null || req.body.description != null
    ? lerTexto(req.body.descricao ?? req.body.description)
    : atual.descricao;
  const concluida = lerBooleano(req.body.concluida ?? req.body.completed, atual.concluida);

  if (!titulo) {
    return res.status(422).json({ message: "Informe o título da tarefa" });
  }

  const tarefa = await prisma.tarefa.update({
    where: { id: atual.id },
    data: { titulo, descricao, concluida },
  });

  await sincronizarTarefa(req.token, tarefa);
  await registrarLog(req.token, {
    acao: concluida && !atual.concluida ? "CONCLUSAO" : "ATUALIZACAO",
    detalhe: concluida && !atual.concluida
      ? `Tarefa concluída: ${tarefa.titulo}`
      : `Tarefa alterada: ${tarefa.titulo}`,
    tarefaId: tarefa.id,
  });

  return res.json({ data: formatarTarefa(tarefa) });
}));

tarefasRouter.delete("/:id", asyncHandler(async (req, res) => {
  const atual = await buscarTarefaDoUsuario(req, res);
  if (!atual) return;

  await prisma.tarefa.delete({ where: { id: atual.id } });
  await sincronizarTarefa(req.token, atual, true);
  await registrarLog(req.token, {
    acao: "EXCLUSAO",
    detalhe: `Tarefa removida: ${atual.titulo}`,
    tarefaId: atual.id,
  });

  return res.status(204).send();
}));
