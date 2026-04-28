# 06 — Headers HTTP e Cache: diagnóstico com o ZAP

Headers HTTP carregam metadados essenciais sobre requisições e respostas. Erros de cache, conteúdo incorreto e ausência de headers de segurança são problemas comuns que o ZAP ajuda a identificar.

---

## Endpoints do lab para exercícios de headers

| Endpoint | O que demonstra |
|---|---|
| `GET /cache-test` | Headers de cache (`Cache-Control`, `ETag`, `Last-Modified`) |
| `GET /wrong-content-type` | JSON com `Content-Type: text/plain` |
| `GET /bad-json` | `Content-Type: application/json` com corpo inválido |
| `GET /missing-headers` | Ausência de headers de segurança comuns |
| `GET /set-cookie` | Cookies com flags diferentes (`HttpOnly`, `Secure`, `SameSite`) |

---

## Exercício 1 — Cache com ETag

1. Configure o Postman com proxy `localhost:8090`.
2. Faça `GET http://localhost:3000/cache-test`.
3. No ZAP, observe os headers de resposta:
   - `Cache-Control: public, max-age=60` — cache por 60 segundos
   - `ETag: "abc123-lab-etag"` — identificador da versão do recurso
   - `Last-Modified: ...`

4. Faça a mesma requisição novamente, desta vez com o header:
   ```
   If-None-Match: "abc123-lab-etag"
   ```
5. Observe no ZAP:
   - Status: **304 Not Modified**
   - Corpo vazio (o cliente usa a versão em cache)

### O que isso significa?

O ETag evita transferência desnecessária de dados. O cliente armazena o ETag e envia na próxima requisição. Se o recurso não mudou, o servidor responde com 304 (sem corpo), economizando banda.

---

## Exercício 2 — Content-Type incorreto

1. Faça `GET http://localhost:3000/wrong-content-type`.
2. Observe no ZAP:
   - `Content-Type: text/plain` na resposta
   - Mas o corpo é um JSON válido

### Problema real

Alguns clientes/parsers dependem do `Content-Type` para decidir como processar a resposta. Se o header disser `text/plain`, o cliente pode não fazer o parse do JSON e tratar como string. Isso causa bugs difíceis de diagnosticar — o ZAP torna o problema imediatamente visível.

---

## Exercício 3 — JSON malformado

1. Faça `GET http://localhost:3000/bad-json`.
2. Observe no ZAP:
   - `Content-Type: application/json`
   - Corpo: `{ "chave": "valor", "quebrado": true, }` (vírgula extra — JSON inválido)
3. Tente parsear o corpo manualmente e veja o erro de sintaxe.

### Por que isso acontece?

Respostas com JSON malformado geralmente causam erros silenciosos no cliente (ex.: `SyntaxError: Unexpected token`). No ZAP você vê exatamente o corpo cru e identifica o problema.

---

## Exercício 4 — Headers de segurança ausentes

1. Faça `GET http://localhost:3000/missing-headers`.
2. Observe no ZAP a ausência dos seguintes headers:
   - `X-Content-Type-Options: nosniff` — evita MIME sniffing
   - `X-Frame-Options: DENY` — evita clickjacking via iframe
   - `Strict-Transport-Security` — força HTTPS (HSTS)
3. Compare com `GET /cache-test` que inclui `X-Content-Type-Options`.

> **Nota:** O ZAP tem uma aba **Alerts** que pode marcar automaticamente ausência de headers de segurança ao fazer uma varredura passiva.

---

## Exercício 5 — Cookies com flags

1. Faça `GET http://localhost:3000/set-cookie`.
2. No ZAP, observe os três `Set-Cookie` na resposta:

   | Cookie | Flags | Implicação |
   |---|---|---|
   | `sessao_segura` | `HttpOnly; Secure; SameSite=Strict` | Seguro: não acessível via JS, só HTTPS, não enviado cross-site |
   | `preferencia` | `SameSite=Lax` | Enviado em navegação top-level, mas não em requisições cross-site |
   | `rastreamento` | (nenhuma) | Acessível via JS, enviado em qualquer origem, sem restrição de transport |

### O que observar

- `HttpOnly`: se ausente, o cookie pode ser lido via `document.cookie` (risco de XSS).
- `Secure`: se ausente, o cookie é enviado em HTTP (sem criptografia).
- `SameSite`: se ausente, o cookie é enviado em requisições cross-site (risco de CSRF).

---

## Exercício 6 — Status codes variados

Use o endpoint `/status/:code` para ver como o ZAP e o cliente tratam diferentes códigos:

```bash
# Teste alguns códigos:
curl -x http://localhost:8090 http://localhost:3000/status/200
curl -x http://localhost:8090 http://localhost:3000/status/201
curl -x http://localhost:8090 http://localhost:3000/status/400
curl -x http://localhost:8090 http://localhost:3000/status/404
curl -x http://localhost:8090 http://localhost:3000/status/429
curl -x http://localhost:8090 http://localhost:3000/status/500
curl -x http://localhost:8090 http://localhost:3000/status/503
```

Observe no ZAP como cada código aparece com cores diferentes no histórico.

---

## Exercício 7 — Resposta lenta (timeout)

1. Faça `GET http://localhost:3000/slow` (atraso padrão: 5 s).
2. Observe no ZAP o tempo de resposta na coluna **RTT** (Round Trip Time).
3. Tente com atraso maior:
   ```
   GET http://localhost:3000/slow?ms=10000
   ```
4. Configure um timeout curto no Postman (**Settings → Request timeout: 3000 ms**) e veja o erro de timeout antes da resposta chegar.

---

## Referência rápida de headers

| Header | Propósito |
|---|---|
| `Content-Type` | Tipo do conteúdo (ex.: `application/json`) |
| `Cache-Control` | Política de cache |
| `ETag` | Identificador de versão do recurso |
| `Last-Modified` | Data da última modificação |
| `X-Content-Type-Options` | Previne MIME sniffing |
| `X-Frame-Options` | Previne clickjacking |
| `Strict-Transport-Security` | Força HTTPS (HSTS) |
| `Set-Cookie` | Define cookies com flags de segurança |

---

## Próximos passos

- [07 — Troubleshooting geral](./07-troubleshooting.md)
