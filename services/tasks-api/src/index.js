import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { tarefasRouter } from "./routes/tarefas.js";
import { registrarLog } from "./services/integracao.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", servico: "tarefas" });
});

app.use("/api/auth", authRouter);
app.use("/api/tarefas", tarefasRouter);

app.use((error, req, res, _next) => {
  console.error(error);
  if (req.token) {
    registrarLog(req.token, {
      acao: "ERRO",
      detalhe: "Erro interno na API de tarefas",
    });
  }
  res.status(500).json({ message: "Erro interno" });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`API de tarefas em http://localhost:${port}`);
});
