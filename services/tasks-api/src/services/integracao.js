async function postJson(url, headers, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
  });

  if (!response.ok) {
    const detalhe = await response.text();
    throw new Error(`Integração falhou (${response.status}): ${detalhe}`);
  }
}

export async function registrarLog(token, { acao, detalhe, tarefaId = null }) {
  try {
    await postJson(`${process.env.LOGS_URL}/logs`, {
      Authorization: `Bearer ${token}`,
    }, {
      acao,
      detalhe,
      tarefaId,
    });
  } catch (error) {
    console.error("Falha ao registrar log:", error.message);
  }
}

export async function registrarLogComoServico({ acao, detalhe, usuarioId = null, tarefaId = null }) {
  try {
    await postJson(`${process.env.LOGS_URL}/logs`, {
      "X-Service-Key": process.env.SERVICE_KEY,
    }, {
      acao,
      detalhe,
      usuarioId,
      tarefaId,
    });
  } catch (error) {
    console.error("Falha ao registrar log de serviço:", error.message);
  }
}

export async function sincronizarTarefa(token, tarefa, deleted = false) {
  try {
    await postJson(`${process.env.ANALYZER_URL}/sync`, {
      Authorization: `Bearer ${token}`,
    }, {
      id: tarefa.id,
      titulo: tarefa.titulo,
      concluida: tarefa.concluida,
      usuarioId: tarefa.usuarioId,
      deleted,
    });
  } catch (error) {
    console.error("Falha ao sincronizar analisador:", error.message);
    await registrarLog(token, {
      acao: "ERRO",
      detalhe: `Falha ao sincronizar a tarefa ${tarefa.id} com o analisador`,
      tarefaId: tarefa.id,
    });
  }
}
