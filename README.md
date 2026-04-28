# owzap-learn 🔍

Laboratório prático para aprender **OWASP ZAP** com foco em **diagnóstico e observabilidade de APIs** — proxy, TLS/certificados, headers, CORS, autenticação — sem objetivo ofensivo.

> **Escopo:** Ambiente local/lab autorizado. As instruções aqui são para diagnóstico e aprendizado, não para ataque.

---

## O que você vai aprender

- Configurar o ZAP como **proxy HTTP/S** e capturar tráfego de APIs
- Inspecionar e entender **JWT** (login, token expirado, fluxo de auth)
- Diagnosticar problemas de **CORS** (origens, preflight, headers)
- Entender **TLS/certificados**: como o ZAP intercepta HTTPS e como instalar o CA
- Analisar **headers HTTP**: `Content-Type`, `Cache-Control`, `ETag`, cookies com flags
- Reproduzir cenários de erro controlados: timeout, JSON inválido, status codes

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2+ |
| Git | qualquer |

Postman ou curl são recomendados (mas opcionais).

---

## Setup rápido (5 minutos)

```bash
# 1. Clone o repositório
git clone https://github.com/gustavo-szesz/owzap-learn.git
cd owzap-learn

# 2. Configure o ambiente
cp .env.example .env

# 3. Suba os serviços
docker compose up --build -d

# 4. Verifique que está tudo no ar
docker compose ps
```

Após o boot (~30 s na primeira vez):

| Serviço | URL | O que é |
|---|---|---|
| API | http://localhost:3000 | API Node.js de exemplo |
| ZAP Web UI | http://localhost:8080 | Interface web do OWASP ZAP |
| ZAP Proxy | localhost:8090 | Proxy HTTP/S para interceptar tráfego |

```bash
# Teste rápido da API
curl http://localhost:3000/
```

---

## Estrutura do repositório

```
owzap-learn/
├── apps/
│   └── api/              # API Node.js (Express)
│       ├── src/
│       │   └── index.js  # Endpoints de laboratório
│       ├── Dockerfile
│       ├── package.json
│       └── .env.example
├── collections/
│   └── owzap-learn.postman_collection.json
├── docs/
│   ├── 01-setup-zap.md           # Subir API e ZAP
│   ├── 02-capturando-trafego.md  # Proxy e captura
│   ├── 03-tls-e-certificados.md  # HTTPS e certificados
│   ├── 04-cors.md                # CORS
│   ├── 05-auth-jwt.md            # Auth e JWT
│   ├── 06-headers-cache.md       # Headers e cache
│   └── 07-troubleshooting.md     # Problemas comuns
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Endpoints da API de laboratório

| Endpoint | Método | Descrição |
|---|---|---|
| `/` | GET | Health check — lista todos os endpoints |
| `/login` | POST | Retorna JWT. Body: `{ "username": "admin", "password": "admin" }` |
| `/profile` | GET | Rota protegida por JWT |
| `/cors-test` | GET | CORS aberto (`Access-Control-Allow-Origin: *`) |
| `/cors-blocked` | GET | CORS restrito a origem específica |
| `/slow` | GET | Resposta lenta (~5 s). Use `?ms=N` para ajustar |
| `/bad-json` | GET | `Content-Type: application/json` com JSON inválido |
| `/wrong-content-type` | GET | JSON enviado com `Content-Type: text/plain` |
| `/missing-headers` | GET | Resposta sem headers de segurança |
| `/cache-test` | GET | Headers de cache (`ETag`, `Cache-Control`) |
| `/set-cookie` | GET | Cookies com flags variadas |
| `/status/:code` | GET | Retorna qualquer HTTP status code (100–599) |
| `/redirect` | GET | Redirect 301 |

---

## Usar o Postman com o ZAP

1. Importe a coleção: `collections/owzap-learn.postman_collection.json`
2. Configure o proxy: **Settings → Proxy → localhost:8090**
3. Desmarque "Bypass proxy for localhost"
4. Execute os requests e observe o histórico em **http://localhost:8080**

---

## Guias passo a passo (PT-BR)

| # | Guia | O que você aprende |
|---|---|---|
| 01 | [Setup ZAP](docs/01-setup-zap.md) | Subir API e ZAP, verificar containers |
| 02 | [Capturando tráfego](docs/02-capturando-trafego.md) | Proxy, histórico, JWT flow |
| 03 | [TLS e Certificados](docs/03-tls-e-certificados.md) | Interceptar HTTPS, instalar CA |
| 04 | [CORS](docs/04-cors.md) | Headers, preflight, diagnóstico |
| 05 | [Auth e JWT](docs/05-auth-jwt.md) | Login, token expirado, fluxo |
| 06 | [Headers e Cache](docs/06-headers-cache.md) | ETag, Content-Type, cookies |
| 07 | [Troubleshooting](docs/07-troubleshooting.md) | Problemas comuns e soluções |

---

## Parar os serviços

```bash
# Parar (mantém dados do ZAP)
docker compose down

# Parar e remover volumes (apaga histórico do ZAP)
docker compose down -v
```

---

## Dicas rápidas

```bash
# Ver logs da API
docker compose logs api -f

# Ver logs do ZAP
docker compose logs zap -f

# Usar o ZAP como proxy com curl
curl -x http://localhost:8090 http://localhost:3000/cors-test

# Simular token expirado: edite .env e troque JWT_EXPIRY=5s, depois:
docker compose up -d api
```

---

## Licença

MIT — veja [LICENSE](LICENSE).
