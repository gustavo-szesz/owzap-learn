# 04 — CORS: diagnóstico com o ZAP

CORS (Cross-Origin Resource Sharing) é um mecanismo que controla quais origens podem fazer requisições para uma API. Erros de CORS são muito comuns no desenvolvimento de SPAs e aplicações mobile.

---

## Conceitos básicos

| Termo | Descrição |
|---|---|
| **Origin** | Combinação de protocolo + domínio + porta (`https://app.example.com:443`) |
| **Simple request** | `GET`/`POST` com headers simples — sem preflight |
| **Preflight** | Requisição `OPTIONS` automática enviada pelo browser antes de `PUT`/`DELETE`/headers customizados |
| `Access-Control-Allow-Origin` | Header de resposta que autoriza a origem |
| `Access-Control-Allow-Headers` | Headers permitidos na requisição |
| `Access-Control-Allow-Methods` | Métodos HTTP permitidos |

---

## Endpoints do lab para exercícios CORS

| Endpoint | Comportamento |
|---|---|
| `GET /cors-test` | CORS aberto (`Access-Control-Allow-Origin: *`) |
| `GET /cors-blocked` | CORS restrito (`origin: https://minha-origem-confiavel.example.com`) |

---

## Exercício 1 — CORS aberto

1. Configure o Postman com proxy `localhost:8090`.
2. Faça `GET http://localhost:3000/cors-test` com o header:
   ```
   Origin: https://meu-app.example.com
   ```
3. No ZAP, observe a resposta:
   - `Access-Control-Allow-Origin: *`
4. **O que isso significa?** Qualquer origem pode ler a resposta — adequado para APIs públicas sem autenticação, **não** recomendado para APIs autenticadas.

---

## Exercício 2 — CORS bloqueado (simular erro de browser)

1. Faça `GET http://localhost:3000/cors-blocked` com:
   ```
   Origin: https://origem-nao-autorizada.example.com
   ```
2. Observe no ZAP que a resposta **não** inclui `Access-Control-Allow-Origin`.
3. Em um browser real, isso resultaria em erro:
   ```
   Access to fetch at 'http://...' from origin '...' has been blocked by CORS policy
   ```

> **Dica:** O ZAP (via curl/Postman) ainda retorna a resposta porque o bloqueio CORS é **imposto pelo browser**, não pelo servidor. O servidor retorna a resposta normalmente; é o browser que a descarta se o header CORS estiver ausente.

---

## Exercício 3 — Simular preflight OPTIONS

```bash
curl -x http://localhost:8090 \
  -X OPTIONS \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: DELETE" \
  -H "Access-Control-Request-Headers: Authorization" \
  http://localhost:3000/cors-blocked \
  -v
```

Observe no ZAP:
- A requisição `OPTIONS` (preflight).
- Os headers `Access-Control-Request-Method` e `Access-Control-Request-Headers` enviados.
- A ausência de `Access-Control-Allow-Origin` na resposta (bloqueado).

---

## O que observar no ZAP para diagnóstico CORS

Ao ver um erro de CORS, verifique no ZAP:

1. **A requisição chegou ao servidor?**
   - Sim → o servidor processou, mas não enviou o header CORS correto.
   - Preflight (`OPTIONS`) → verifique se o servidor responde ao OPTIONS.

2. **Headers de resposta:**
   - `Access-Control-Allow-Origin` presente? Com qual valor?
   - `Access-Control-Allow-Headers` inclui o header customizado enviado?
   - `Access-Control-Allow-Methods` inclui o método usado?

3. **Credentials (cookies/auth):**
   - Se a requisição usa `credentials: 'include'`, o servidor deve responder com `Access-Control-Allow-Origin: <origem-específica>` (não `*`) e `Access-Control-Allow-Credentials: true`.

---

## Checklist de diagnóstico CORS

```
[ ] A origem do cliente bate com o valor em Access-Control-Allow-Origin?
[ ] Se usou credentials, a origem está explícita (não *)?
[ ] O método HTTP está em Access-Control-Allow-Methods?
[ ] Headers customizados estão em Access-Control-Allow-Headers?
[ ] A rota responde ao método OPTIONS (preflight)?
[ ] O servidor retorna status 200/204 para OPTIONS?
```

---

## Próximos passos

- [05 — Auth e JWT](./05-auth-jwt.md)
- [06 — Headers e Cache](./06-headers-cache.md)
