# 05 — Autenticação e JWT: diagnóstico com o ZAP

JWT (JSON Web Token) é amplamente usado para autenticação em APIs REST. O ZAP permite observar cada etapa do fluxo de autenticação.

---

## Estrutura de um JWT

Um JWT tem três partes separadas por ponto (`.`):

```
eyJhbGciOiJIUzI1NiJ9   ← Header (Base64)
.eyJzdWIiOiJhZG1pbiJ9  ← Payload (Base64)
.assinatura             ← Signature (HMAC/RSA)
```

Decodifique qualquer JWT em [jwt.io](https://jwt.io) para ver o conteúdo.

> **Nota:** O payload do JWT é apenas codificado em Base64, **não criptografado**. Qualquer um com o token pode ler o payload. Nunca coloque dados sensíveis (senha, dados pessoais) no payload.

---

## Endpoints do lab para exercícios de auth

| Endpoint | Descrição |
|---|---|
| `POST /login` | Retorna um JWT. Body: `{ "username": "admin", "password": "admin" }` |
| `GET /profile` | Rota protegida. Requer header `Authorization: Bearer <token>` |

---

## Exercício 1 — Fluxo completo de login

1. Configure o Postman com proxy `localhost:8090`.
2. Faça `POST http://localhost:3000/login`:
   ```json
   { "username": "admin", "password": "admin" }
   ```
3. No ZAP, observe a requisição e resposta:
   - A senha é enviada em **texto puro** (sem HTTPS local). Em produção, sempre use HTTPS.
   - A resposta contém `token` e `expiresAt`.
4. Copie o token e cole em [jwt.io](https://jwt.io):
   - Veja o payload: `sub`, `role`, `iat` (issued at), `exp` (expiration).

---

## Exercício 2 — Credenciais erradas

1. Faça `POST /login` com senha errada:
   ```json
   { "username": "admin", "password": "errada" }
   ```
2. Observe o **401** no ZAP.
3. Tente também sem body → observe o **400** com a mensagem de validação.

---

## Exercício 3 — Acesso sem token

1. Faça `GET http://localhost:3000/profile` sem o header `Authorization`.
2. Observe no ZAP:
   - Status: `401`
   - Body: `{ "error": "Token ausente", "hint": "..." }`

---

## Exercício 4 — Token expirado

> Antes deste exercício, edite `.env`: `JWT_EXPIRY=5s` e reinicie com `docker compose up -d`.

1. Faça login (`POST /login`) e copie o token.
2. Aguarde 10 segundos.
3. Faça `GET /profile` com o token.
4. Observe no ZAP:
   - Status: `401`
   - Body: `{ "error": "Token expirado", "detail": "jwt expired" }`

### Por que isso importa?

Em produção, tokens com expiração curta são mais seguros (se vazado, fica inválido rapidamente). O cliente precisa tratar o **401 com "Token expirado"** e fazer o refresh. No ZAP você vê exatamente qual requisição falhou e por quê.

---

## Exercício 5 — Token adulterado

1. Pegue um token válido.
2. Modifique o último caractere da assinatura.
3. Faça `GET /profile` com o token adulterado.
4. Observe no ZAP:
   - Status: `401`
   - Body: `{ "error": "Token inválido", "detail": "invalid signature" }`

---

## Exercício 6 — Token no header vs. body

O ZAP permite ver **onde** o token é enviado. Compare:

- Header `Authorization: Bearer <token>` (padrão OAuth 2.0 / Bearer).
- Query string `?token=<token>` (evitar — aparece em logs de servidor).
- Cookie (útil para web apps, requer proteção CSRF).

---

## O que observar no ZAP para diagnóstico de auth

| O que ver | Onde ver no ZAP |
|---|---|
| Token enviado na requisição | Aba **Request** → Headers |
| Resposta de erro 401 | Aba **Response** → Body |
| Tempo de expiração | Decodifique o JWT: campo `exp` |
| HTTPS ativo? | URL começa com `https://` no ZAP |
| Cookie com HttpOnly? | Aba **Response** → `Set-Cookie` header |

---

## Checklist de diagnóstico de auth

```
[ ] O login retornou 200 e um token?
[ ] O token foi enviado no header Authorization (não query string)?
[ ] O token ainda está no prazo (verifique exp em jwt.io)?
[ ] A requisição usa HTTPS (token não exposto em texto)?
[ ] O servidor retorna 401 com mensagem clara ao negar acesso?
[ ] O cliente trata o 401 e refaz login quando necessário?
```

---

## Próximos passos

- [06 — Headers e Cache](./06-headers-cache.md)
- [07 — Troubleshooting geral](./07-troubleshooting.md)
