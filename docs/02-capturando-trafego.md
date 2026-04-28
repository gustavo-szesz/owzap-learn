# 02 — Capturando tráfego da API com o ZAP como proxy

O ZAP atua como um **proxy HTTP/S intermediário**: todo tráfego entre o seu cliente (curl, Postman, browser) e a API passa pelo ZAP, que registra cada requisição e resposta.

```
[cliente] ──proxy──> [ZAP :8090] ──forward──> [API :3000]
```

---

## 1. Confirme que o proxy está ativo

O proxy do ZAP escuta em `localhost:8090`. Verifique:

```bash
curl -x http://localhost:8090 http://localhost:3000/
```

Se retornar o JSON da API, o proxy está funcionando.

---

## 2. Configurar o Postman para usar o proxy do ZAP

1. No Postman, vá em **Settings → Proxy**.
2. Ative **Use Custom Proxy Configuration**.
3. Preencha:
   - **Proxy Server:** `localhost`
   - **Port:** `8090`
4. Desmarque "Bypass proxy for localhost" (precisamos rotear para o ZAP).
5. Clique **Save**.

Agora toda requisição do Postman passa pelo ZAP.

---

## 3. Configurar curl para usar o proxy

```bash
export http_proxy=http://localhost:8090
export https_proxy=http://localhost:8090
# A partir daqui todo curl usa o ZAP como proxy
curl http://localhost:3000/profile
```

Para uma requisição avulsa:

```bash
curl -x http://localhost:8090 http://localhost:3000/cors-test
```

---

## 4. Observe o histórico no ZAP

Acesse **http://localhost:8080** → aba **History** (ou **Sites**).

Cada requisição aparece com:
- Método, URL, status code
- Headers de requisição e resposta
- Corpo completo

### Exercício 1 — Login e token JWT

1. No Postman (com proxy ativo), faça:
   ```
   POST http://localhost:3000/login
   Body (JSON): { "username": "admin", "password": "admin" }
   ```
2. No ZAP, clique na requisição `POST /login`.
3. Observe na aba **Response**:
   - O campo `token` (JWT em Base64).
   - O campo `expiresAt`.
4. Copie o token. Cole-o em [jwt.io](https://jwt.io) e veja o payload decodificado.

### Exercício 2 — Rota protegida sem token

1. Faça `GET http://localhost:3000/profile` **sem** o header `Authorization`.
2. Observe o status **401** no ZAP e o corpo da resposta com o hint.

### Exercício 3 — Rota protegida com token válido

1. Adicione o header `Authorization: Bearer <token>` (token do exercício 1).
2. Faça `GET http://localhost:3000/profile`.
3. Veja o status **200** e o payload do usuário no ZAP.

### Exercício 4 — Token expirado

1. Pare os containers: `docker compose down`
2. Edite `.env`: `JWT_EXPIRY=5s`
3. Suba novamente: `docker compose up -d`
4. Faça login, aguarde 10 segundos e tente acessar `/profile`.
5. Observe o **401** com `"error": "Token expirado"` no ZAP.

---

## 5. Filtrar e buscar no histórico do ZAP

- **Ctrl+F** na aba History: busca por URL, método ou status.
- Clique com botão direito → **Break** para interceptar e editar requisições em tempo real.
- Aba **Alerts**: o ZAP marca automaticamente observações (informativas, não ataques).

---

## Próximos passos

- [03 — TLS e certificados](./03-tls-e-certificados.md)
- [04 — CORS](./04-cors.md)
