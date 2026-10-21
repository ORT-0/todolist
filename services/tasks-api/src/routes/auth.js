import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { asyncHandler, usuarioPublico } from "../http.js";
import { autenticar, emitirToken } from "../middleware/auth.js";
import { registrarLogComoServico } from "../services/integracao.js";

export const authRouter = Router();

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/cadastro", asyncHandler(async (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  if (nome.length < 2) {
    return res.status(422).json({ message: "Informe um nome com pelo menos 2 caracteres" });
  }
  if (!emailValido(email)) {
    return res.status(422).json({ message: "Informe um email válido" });
  }
  if (senha.length < 6) {
    return res.status(422).json({ message: "A senha deve ter pelo menos 6 caracteres" });
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return res.status(409).json({ message: "Email já cadastrado" });
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: await bcrypt.hash(senha, 10),
    },
  });

  const token = emitirToken(usuario);
  return res.status(201).json({
    token,
    usuario: usuarioPublico(usuario),
  });
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const senha = String(req.body.senha || "");

  const usuario = email
    ? await prisma.usuario.findUnique({ where: { email } })
    : null;
  const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senha) : false;

  if (!usuario || !senhaConfere) {
    await registrarLogComoServico({
      acao: "ACESSO_INDEVIDO",
      detalhe: `Tentativa de login inválida para o email ${email || "(vazio)"}`,
      usuarioId: usuario?.id ?? null,
    });
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  return res.json({
    token: emitirToken(usuario),
    usuario: usuarioPublico(usuario),
  });
}));

authRouter.get("/me", autenticar, asyncHandler(async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario.id } });
  if (!usuario) {
    return res.status(401).json({ message: "Usuário não encontrado" });
  }
  return res.json(usuarioPublico(usuario));
}));
