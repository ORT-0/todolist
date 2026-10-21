# Todo List distribuída

Três serviços, cada um com sua linguagem e seu ORM. O usuário autentica na API de tarefas e só enxerga as próprias tarefas, estatísticas e logs.

| Serviço | Pasta | Stack | Porta |
| --- | --- | --- | --- |
| Tarefas e autenticação | `services/tasks-api` | Node.js, Express, Prisma | 3001 |
| Logs | `services/logs-api` | PHP, Laravel, Eloquent | 8000 |
| Contador | `services/analyzer-api` | Python, FastAPI, SQLAlchemy | 8001 |
| Frontend | `frontend` | HTML, CSS, JavaScript | 5173 |

A senha é armazenada com bcrypt. O token JWT emitido no login acompanha as chamadas entre os serviços. O segredo `JWT_SECRET` precisa ser o mesmo nos três `.env`.

## Subir o ambiente

Na primeira vez:

```powershell
cd services\tasks-api
npm install
$env:CI = "true"
npx prisma migrate dev --name init

cd ..\logs-api
composer install
composer require firebase/php-jwt
php artisan key:generate
New-Item -ItemType File -Force -Path database\database.sqlite
php artisan migrate

cd ..\analyzer-api
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Para iniciar tudo:

```powershell
.\iniciar.ps1
```

Abra http://localhost:5173, crie uma conta e cadastre tarefas. Cada conta vê somente os próprios dados.
