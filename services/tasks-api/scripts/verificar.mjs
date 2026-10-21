const tasks = "http://127.0.0.1:3001/api";
const logs = "http://127.0.0.1:8000/api";
const analyzer = "http://127.0.0.1:8001/api";

function assert(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const texto = await response.text();
  let body = texto;
  try {
    body = texto ? JSON.parse(texto) : null;
  } catch {
    body = texto;
  }
  return { status: response.status, body };
}

const sufixo = Date.now();
const alice = await json(`${tasks}/auth/cadastro`, {
  method: "POST",
  body: JSON.stringify({
    nome: "Alice",
    email: `alice${sufixo}@teste.com`,
    senha: "segredo1",
  }),
});
assert(alice.status === 201, `cadastro alice ${alice.status} ${JSON.stringify(alice.body)}`);
assert(!("senha" in (alice.body.usuario || {})), "senha vazou no cadastro");

const bob = await json(`${tasks}/auth/cadastro`, {
  method: "POST",
  body: JSON.stringify({
    nome: "Bob",
    email: `bob${sufixo}@teste.com`,
    senha: "segredo2",
  }),
});
assert(bob.status === 201, `cadastro bob ${bob.status}`);

const loginRuim = await json(`${tasks}/auth/login`, {
  method: "POST",
  body: JSON.stringify({ email: alice.body.usuario.email, senha: "errada" }),
});
assert(loginRuim.status === 401, "login inválido deveria falhar");

const criada = await json(`${tasks}/tarefas`, {
  method: "POST",
  headers: { Authorization: `Bearer ${alice.body.token}` },
  body: JSON.stringify({ titulo: "Estudar ORM", descricao: "Prisma" }),
});
assert(criada.status === 201, `criar tarefa ${criada.status} ${JSON.stringify(criada.body)}`);
const tarefaId = criada.body.data.id;

const listaBob = await json(`${tasks}/tarefas`, {
  headers: { Authorization: `Bearer ${bob.body.token}` },
});
assert(listaBob.status === 200, "bob deveria listar");
assert(listaBob.body.data.length === 0, "bob viu tarefa da alice");

const invasao = await json(`${tasks}/tarefas/${tarefaId}`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${bob.body.token}` },
  body: JSON.stringify({ concluida: true }),
});
assert(invasao.status === 403, `invasão deveria ser 403, veio ${invasao.status}`);

const concluir = await json(`${tasks}/tarefas/${tarefaId}`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${alice.body.token}` },
  body: JSON.stringify({ concluida: true }),
});
assert(concluir.status === 200 && concluir.body.data.concluida === true, "alice não concluiu");

const statsAlice = await json(`${analyzer}/stats`, {
  headers: { Authorization: `Bearer ${alice.body.token}` },
});
assert(statsAlice.status === 200, `stats alice ${statsAlice.status} ${JSON.stringify(statsAlice.body)}`);
assert(statsAlice.body.usuarioId === alice.body.usuario.id, "stats usuario errado");
assert(statsAlice.body.total === 1 && statsAlice.body.concluidas === 1 && statsAlice.body.pendentes === 0, `contagem alice ${JSON.stringify(statsAlice.body)}`);

const statsBob = await json(`${analyzer}/stats`, {
  headers: { Authorization: `Bearer ${bob.body.token}` },
});
assert(statsBob.body.total === 0 && statsBob.body.usuarioId === bob.body.usuario.id, `contagem bob ${JSON.stringify(statsBob.body)}`);

const logsAlice = await json(`${logs}/logs`, {
  headers: { Authorization: `Bearer ${alice.body.token}` },
});
assert(logsAlice.status === 200, `logs alice ${logsAlice.status} ${JSON.stringify(logsAlice.body)}`);
const acoesAlice = logsAlice.body.data.map((item) => item.acao);
assert(acoesAlice.includes("CRIACAO"), `falta CRIACAO ${acoesAlice}`);
assert(acoesAlice.includes("CONCLUSAO"), `falta CONCLUSAO ${acoesAlice}`);
assert(acoesAlice.every((acao) => logsAlice.body.data.find((item) => item.acao === acao).usuarioId === alice.body.usuario.id), "log de outro usuário");

const logsBob = await json(`${logs}/logs`, {
  headers: { Authorization: `Bearer ${bob.body.token}` },
});
const acoesBob = logsBob.body.data.map((item) => item.acao);
assert(acoesBob.includes("ACESSO_INDEVIDO"), `bob sem acesso indevido ${acoesBob}`);
assert(!acoesBob.includes("CRIACAO"), "bob viu log de criação da alice");

const semToken = await json(`${tasks}/tarefas`);
assert(semToken.status === 401, "rota de tarefas sem token");

console.log("Integracao ok");
console.log(JSON.stringify({
  alice: alice.body.usuario,
  statsAlice: statsAlice.body,
  acoesAlice,
  acoesBob,
}, null, 2));
