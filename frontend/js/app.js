import {
    cadastrar,
    login,
    getTodos,
    createTodo,
    toggleTodo,
    deleteTodo,
    getStats,
    getLogs
} from "./todoService.js";

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const toggleAuth = document.getElementById("toggleAuth");
const authTitle = document.getElementById("authTitle");
const authError = document.getElementById("authError");
const appError = document.getElementById("appError");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");
const form = document.getElementById("todoForm");
const todoList = document.getElementById("todoList");
const logList = document.getElementById("logList");
const totalSpan = document.getElementById("total");
const completedSpan = document.getElementById("completed");
const pendingSpan = document.getElementById("pending");

const ACOES = {
    CRIACAO: "Criação",
    CONCLUSAO: "Conclusão",
    ATUALIZACAO: "Atualização",
    EXCLUSAO: "Exclusão",
    ACESSO_INDEVIDO: "Acesso indevido",
    ERRO: "Erro"
};

let modoCadastro = false;

function escapeHtml(texto) {
    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function sessaoAtual() {
    const token = localStorage.getItem("todolist_token");
    const bruto = localStorage.getItem("todolist_usuario");
    if (!token || !bruto) return null;

    try {
        return JSON.parse(bruto);
    } catch {
        return null;
    }
}

function salvarSessao(token, usuario) {
    localStorage.setItem("todolist_token", token);
    localStorage.setItem("todolist_usuario", JSON.stringify(usuario));
}

function limparSessao() {
    localStorage.removeItem("todolist_token");
    localStorage.removeItem("todolist_usuario");
}

function mostrarLogin(mensagem = "") {
    modoCadastro = false;
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    authTitle.textContent = "Entrar";
    toggleAuth.textContent = "Não tem conta? Cadastre-se";
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    authError.textContent = mensagem;
}

function mostrarApp() {
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    authError.textContent = "";
    userName.textContent = sessaoAtual()?.nome || "";
    refresh();
}

function formatarData(valor) {
    if (!valor) return "";
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return valor;
    return data.toLocaleString("pt-BR");
}

async function renderTodos() {
    const todos = await getTodos();
    todoList.innerHTML = "";

    if (!todos.length) {
        todoList.innerHTML = `<li class="empty">Nenhuma tarefa ainda.</li>`;
        return;
    }

    todos.forEach(todo => {
        const concluida = Boolean(todo.concluida ?? todo.completed);
        const descricao = todo.descricao || todo.description || "";
        const li = document.createElement("li");
        if (concluida) li.classList.add("completed");

        li.innerHTML = `
            <div class="task-text">
                <span>${escapeHtml(todo.titulo || todo.title || "")}</span>
                ${descricao ? `<small class="task-description">${escapeHtml(descricao)}</small>` : ""}
            </div>
            <div class="actions">
                <button class="btn-complete" type="button">✔</button>
                <button class="btn-delete" type="button">✖</button>
            </div>
        `;

        li.querySelector(".btn-complete").addEventListener("click", async () => {
            try {
                await toggleTodo(todo.id, concluida);
                await refresh();
            } catch (error) {
                appError.textContent = error.message;
            }
        });

        li.querySelector(".btn-delete").addEventListener("click", async () => {
            try {
                await deleteTodo(todo.id);
                await refresh();
            } catch (error) {
                appError.textContent = error.message;
            }
        });

        todoList.appendChild(li);
    });
}

async function renderStats() {
    const stats = await getStats();
    totalSpan.textContent = stats.total ?? stats.totalTodos ?? 0;
    completedSpan.textContent = stats.concluidas ?? stats.completed ?? 0;
    pendingSpan.textContent = stats.pendentes ?? Math.max(0, (stats.total ?? 0) - (stats.concluidas ?? 0));
}

async function renderLogs() {
    const logs = await getLogs();
    logList.innerHTML = "";

    if (!logs.length) {
        logList.innerHTML = `<li class="empty">Nenhum registro ainda.</li>`;
        return;
    }

    logs.forEach(log => {
        const li = document.createElement("li");
        li.classList.add("log-item");
        li.innerHTML = `
            <strong>${escapeHtml(ACOES[log.acao] || log.acao)}</strong>
            <span>${escapeHtml(log.detalhe || "")}</span>
            <small class="log-meta">${escapeHtml(formatarData(log.timestamp))}</small>
        `;
        logList.appendChild(li);
    });
}

async function refresh() {
    appError.textContent = "";
    const resultados = await Promise.allSettled([
        renderTodos(),
        renderStats(),
        renderLogs()
    ]);
    const falhas = resultados
        .filter(resultado => resultado.status === "rejected")
        .map(resultado => resultado.reason?.message || "Falha ao atualizar a tela");

    if (falhas.length) {
        appError.textContent = falhas.join(" ");
    }
}

toggleAuth.addEventListener("click", () => {
    modoCadastro = !modoCadastro;
    loginForm.classList.toggle("hidden", modoCadastro);
    registerForm.classList.toggle("hidden", !modoCadastro);
    authTitle.textContent = modoCadastro ? "Criar conta" : "Entrar";
    toggleAuth.textContent = modoCadastro
        ? "Já tem conta? Entrar"
        : "Não tem conta? Cadastre-se";
    authError.textContent = "";
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";
    const button = loginForm.querySelector("button");
    button.disabled = true;

    try {
        const resultado = await login({
            email: document.getElementById("loginEmail").value,
            senha: document.getElementById("loginSenha").value
        });
        salvarSessao(resultado.token, resultado.usuario);
        loginForm.reset();
        mostrarApp();
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.textContent = "";
    const button = registerForm.querySelector("button");
    button.disabled = true;

    try {
        const resultado = await cadastrar({
            nome: document.getElementById("registerNome").value,
            email: document.getElementById("registerEmail").value,
            senha: document.getElementById("registerSenha").value
        });
        salvarSessao(resultado.token, resultado.usuario);
        registerForm.reset();
        mostrarApp();
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

logoutBtn.addEventListener("click", () => {
    limparSessao();
    mostrarLogin();
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    appError.textContent = "";
    const button = form.querySelector("button");
    button.disabled = true;

    try {
        await createTodo({
            title: document.getElementById("title").value,
            description: document.getElementById("description").value
        });
        form.reset();
        await refresh();
    } catch (error) {
        appError.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

window.addEventListener("auth:logout", () => {
    mostrarLogin("Sua sessão expirou. Entre novamente.");
});

if (sessaoAtual()) {
    mostrarApp();
} else {
    mostrarLogin();
}
