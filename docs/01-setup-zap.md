# 01 — Setup: Subindo a API e o ZAP com Docker

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Docker | 24+ |
| Docker Compose | v2+ (`docker compose`) |
| Git | qualquer |

Postman ou qualquer cliente HTTP são opcionais mas recomendados.

---

## 1. Clone o repositório

```bash
git clone https://github.com/gustavo-szesz/owzap-learn.git
cd owzap-learn
```

---

## 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Abra `.env` e ajuste se quiser. Os valores padrão já funcionam para o lab.

> **Dica:** Altere `JWT_EXPIRY=10s` para simular token expirado rapidamente.

---

## 3. Suba os serviços

```bash
docker compose up --build -d
```

Aguarde os containers iniciarem (~30 s na primeira vez — a imagem do ZAP é grande).

Verifique os serviços:

```bash
docker compose ps
```

Você deve ver dois containers em execução:

| Container | Porta | O que é |
|---|---|---|
| `owzap-api` | `localhost:3000` | API Node.js de exemplo |
| `owzap-zap` | `localhost:8080` (UI) / `localhost:8090` (proxy) | OWASP ZAP |

---

## 4. Teste rápido da API

```bash
curl http://localhost:3000/
```

Resposta esperada:

```json
{
  "status": "ok",
  "message": "owzap-learn API — laboratório de diagnóstico",
  "endpoints": [...]
}
```

---

## 5. Acesse a interface web do ZAP

Abra no browser: **http://localhost:8080**

Você verá a ZAP Web UI (modo daemon com API REST habilitada).

---

## 6. Parar os serviços

```bash
docker compose down
```

Para remover os volumes também (apaga histórico do ZAP):

```bash
docker compose down -v
```

---

## Próximos passos

- [02 — Capturando tráfego com o ZAP como proxy](./02-capturando-trafego.md)
- [03 — TLS e certificados](./03-tls-e-certificados.md)
