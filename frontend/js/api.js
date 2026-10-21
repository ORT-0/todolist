export const API_CONFIG = {
    TASKS: "http://localhost:3001/api",
    LOGS: "http://localhost:8000/api",
    ANALYZER: "http://localhost:8001/api"
};

export function authHeaders() {
    const token = localStorage.getItem("todolist_token");
    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json"
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
}

export async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...authHeaders(),
            ...(options.headers || {})
        }
    });

    const tentativaDeLogin = url.includes("/auth/login") || url.includes("/auth/cadastro");
    if (response.status === 401 && !tentativaDeLogin) {
        localStorage.removeItem("todolist_token");
        localStorage.removeItem("todolist_usuario");
        window.dispatchEvent(new CustomEvent("auth:logout"));
    }

    return response;
}
