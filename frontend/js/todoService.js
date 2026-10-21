import { API_CONFIG, apiFetch } from "./api.js";

async function lerJson(response) {
    const texto = await response.text();
    if (!texto) return {};

    try {
        return JSON.parse(texto);
    } catch {
        return { message: texto };
    }
}

function mensagemErro(body, padrao) {
    if (typeof body.message === "string") return body.message;
    if (typeof body.detail === "string") return body.detail;
    return padrao;
}

export async function cadastrar(dados) {
    const response = await apiFetch(`${API_CONFIG.TASKS}/auth/cadastro`, {
        method: "POST",
        body: JSON.stringify(dados)
    });
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível cadastrar"));
    return body;
}

export async function login(dados) {
    const response = await apiFetch(`${API_CONFIG.TASKS}/auth/login`, {
        method: "POST",
        body: JSON.stringify(dados)
    });
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível entrar"));
    return body;
}

export async function getTodos() {
    const response = await apiFetch(`${API_CONFIG.TASKS}/tarefas`);
    const result = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(result, "Não foi possível carregar as tarefas"));
    return result.data || [];
}

export async function createTodo(data) {
    const response = await apiFetch(`${API_CONFIG.TASKS}/tarefas`, {
        method: "POST",
        body: JSON.stringify({
            titulo: data.titulo ?? data.title,
            descricao: data.descricao ?? data.description ?? ""
        })
    });
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível criar a tarefa"));
    return body;
}

export async function toggleTodo(id, concluidaAtual) {
    const response = await apiFetch(`${API_CONFIG.TASKS}/tarefas/${id}`, {
        method: "PUT",
        body: JSON.stringify({ concluida: !concluidaAtual })
    });
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível atualizar a tarefa"));
    return body;
}

export async function deleteTodo(id) {
    const response = await apiFetch(`${API_CONFIG.TASKS}/tarefas/${id}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        const body = await lerJson(response);
        throw new Error(mensagemErro(body, "Não foi possível remover a tarefa"));
    }
}

export async function getStats() {
    const response = await apiFetch(`${API_CONFIG.ANALYZER}/stats`);
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível carregar as estatísticas"));
    return body;
}

export async function getLogs() {
    const response = await apiFetch(`${API_CONFIG.LOGS}/logs`);
    const body = await lerJson(response);
    if (!response.ok) throw new Error(mensagemErro(body, "Não foi possível carregar os logs"));
    return body.data || [];
}
