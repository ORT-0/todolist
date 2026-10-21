import jwt from "jsonwebtoken";

export function autenticar(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: Number(payload.sub),
      email: payload.email,
      nome: payload.nome,
    };
    req.token = token;
    return next();
  } catch {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

export function emitirToken(usuario) {
  return jwt.sign(
    {
      sub: String(usuario.id),
      email: usuario.email,
      nome: usuario.nome,
    },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
}
