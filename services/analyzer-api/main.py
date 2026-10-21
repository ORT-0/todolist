import json
import os
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import Boolean, Integer, String, create_engine, func, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


def carregar_env(caminho: Path) -> None:
    if not caminho.exists():
        return
    for linha in caminho.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        os.environ.setdefault(chave.strip(), valor.strip().strip('"'))


carregar_env(Path(__file__).with_name(".env"))

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-todolist-jwt-secret-change-me")
LOGS_URL = os.environ.get("LOGS_URL", "http://localhost:8000/api")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///analyzer.db")

if DATABASE_URL.startswith("sqlite:///") and not DATABASE_URL.startswith("sqlite:////"):
    nome_arquivo = DATABASE_URL.removeprefix("sqlite:///")
    caminho_banco = Path(__file__).with_name(nome_arquivo)
    DATABASE_URL = f"sqlite:///{caminho_banco.as_posix()}"


class Base(DeclarativeBase):
    pass


class Tarefa(Base):
    __tablename__ = "tarefas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(255))
    concluida: Mapped[bool] = mapped_column(Boolean, default=False)
    usuario_id: Mapped[int] = mapped_column(Integer, index=True)


engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base.metadata.create_all(engine)

app = FastAPI(title="Analisador de tarefas")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Sincronizacao(BaseModel):
    id: int
    titulo: str
    concluida: bool
    usuarioId: int
    deleted: bool = False


def obter_sessao():
    sessao = SessionLocal()
    try:
        yield sessao
        sessao.commit()
    except Exception:
        sessao.rollback()
        raise
    finally:
        sessao.close()


def autenticar(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Não autenticado")

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    if payload.get("sub") is None:
        raise HTTPException(status_code=401, detail="Token inválido")

    return {
        "id": int(payload["sub"]),
        "email": payload.get("email"),
        "nome": payload.get("nome"),
        "token": token,
    }


def notificar_log(token: str, acao: str, detalhe: str, tarefa_id: int | None = None) -> None:
    corpo = json.dumps({
        "acao": acao,
        "detalhe": detalhe,
        "tarefaId": tarefa_id,
    }).encode("utf-8")
    requisicao = Request(
        f"{LOGS_URL}/logs",
        data=corpo,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urlopen(requisicao, timeout=4) as resposta:
            resposta.read()
    except (URLError, TimeoutError, OSError):
        return


def contagem_do_usuario(sessao: Session, usuario_id: int) -> dict:
    total = sessao.scalar(
        select(func.count()).select_from(Tarefa).where(Tarefa.usuario_id == usuario_id)
    ) or 0
    concluidas = sessao.scalar(
        select(func.count()).select_from(Tarefa).where(
            Tarefa.usuario_id == usuario_id,
            Tarefa.concluida.is_(True),
        )
    ) or 0
    pendentes = total - concluidas
    return {
        "usuarioId": usuario_id,
        "total": total,
        "concluidas": concluidas,
        "pendentes": pendentes,
        "totalTodos": total,
        "completed": concluidas,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "servico": "analisador"}


@app.get("/api/stats")
def estatisticas(
    usuario: dict = Depends(autenticar),
    sessao: Session = Depends(obter_sessao),
):
    return contagem_do_usuario(sessao, usuario["id"])


@app.post("/api/sync")
def sincronizar(
    payload: Sincronizacao,
    usuario: dict = Depends(autenticar),
    sessao: Session = Depends(obter_sessao),
):
    if payload.usuarioId != usuario["id"]:
        notificar_log(
            usuario["token"],
            "ACESSO_INDEVIDO",
            f"Usuário {usuario['id']} tentou sincronizar dados do usuário {payload.usuarioId}",
            payload.id,
        )
        raise HTTPException(status_code=403, detail="Não autorizado a sincronizar dados de outro usuário")

    tarefa = sessao.get(Tarefa, payload.id)
    if tarefa is not None and tarefa.usuario_id != usuario["id"]:
        notificar_log(
            usuario["token"],
            "ACESSO_INDEVIDO",
            f"Usuário {usuario['id']} tentou alterar a tarefa {payload.id} do usuário {tarefa.usuario_id}",
            payload.id,
        )
        raise HTTPException(status_code=403, detail="Não autorizado a alterar tarefa de outro usuário")

    if payload.deleted:
        if tarefa is not None:
            sessao.delete(tarefa)
        return {"ok": True}

    if tarefa is None:
        sessao.add(Tarefa(
            id=payload.id,
            titulo=payload.titulo,
            concluida=payload.concluida,
            usuario_id=usuario["id"],
        ))
    else:
        tarefa.titulo = payload.titulo
        tarefa.concluida = payload.concluida
        tarefa.usuario_id = usuario["id"]

    return {"ok": True}
