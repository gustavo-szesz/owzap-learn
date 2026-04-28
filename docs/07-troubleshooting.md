# 07 — Troubleshooting: problemas comuns e como diagnosticar

Este guia consolida os problemas mais frequentes que você pode encontrar ao usar o ZAP como proxy e ao analisar APIs, com passos para diagnosticar e entender cada um.

---

## Problemas com o proxy ZAP

### Requisição não aparece no histórico do ZAP

| Causa provável | Solução |
|---|---|
| Proxy não configurado no cliente | Configure `localhost:8090` no Postman/curl/browser |
| "Bypass proxy for localhost" ativo | Desmarque essa opção nas configurações de proxy do Postman |
| ZAP não está rodando | Verifique com `docker compose ps` |
| Porta 8090 não está exposta | Verifique o `docker-compose.yml` |

**Diagnóstico rápido:**
```bash
# Testa se o proxy responde
curl -x http://localhost:8090 http://localhost:3000/ -v
```

---

### Erro de conexão ao tentar usar o proxy

```
curl: (7) Failed to connect to localhost port 8090: Connection refused
```

**Causa:** ZAP não está rodando ou a porta 8090 não está mapeada.

```bash
# Verifique os containers
docker compose ps

# Verifique logs do ZAP
docker compose logs zap
```

---

### HTTPS não funciona com o proxy (erro de certificado)

```
SSL certificate problem: unable to get local issuer certificate
```

**Causa:** O certificado CA do ZAP não está importado no cliente.

**Solução:** Siga o guia [03 — TLS e Certificados](./03-tls-e-certificados.md).

```bash
# Exportar o CA do ZAP
curl -o zap-ca.cer "http://localhost:8080/OTHER/core/other/rootcert/"

# Usar com curl
curl --cacert zap-ca.cer -x http://localhost:8090 https://exemplo.com/
```

---

## Problemas com a API

### Container da API não sobe

```bash
# Ver logs da API
docker compose logs api

# Rebuild forçado
docker compose up --build -d api
```

Causas comuns:
- Porta 3000 já em uso → `lsof -i :3000` (Linux/macOS) ou `netstat -ano | findstr :3000` (Windows).
- Erro de sintaxe no código (raro, mas possível após edições).

---

### 401 — Token ausente ou inválido

```json
{ "error": "Token ausente", "hint": "Envie o header: Authorization: Bearer <token>" }
```

**Checklist:**
```
[ ] Fez login em POST /login?
[ ] Copiou o token completo (sem espaços extras)?
[ ] O header está correto: Authorization: Bearer <token>?
[ ] O token ainda está no prazo? (verifique exp em jwt.io)
[ ] JWT_EXPIRY não está muito curto no .env?
```

---

### 401 — Token expirado

```json
{ "error": "Token expirado", "detail": "jwt expired" }
```

**Solução:** Faça login novamente em `POST /login` e use o novo token.

Para ambiente de desenvolvimento, aumente `JWT_EXPIRY` em `.env` (ex.: `1h`).

---

### CORS bloqueado no browser

O browser exibe:
```
Access to fetch at 'http://localhost:3000/cors-blocked' from origin 'https://...' 
has been blocked by CORS policy
```

**O ZAP mostrará que a requisição chegou ao servidor** mas a resposta não tem `Access-Control-Allow-Origin`. O bloqueio é feito pelo browser, não pelo servidor.

Veja o guia completo: [04 — CORS](./04-cors.md).

---

### Resposta JSON não é parseada pelo cliente

**Sintoma:** Cliente trata a resposta como string em vez de objeto.

**Diagnóstico no ZAP:**
1. Observe o header `Content-Type` da resposta.
2. Se for `text/plain` em vez de `application/json`, o cliente pode não parsear.
3. Endpoint para reproduzir: `GET /wrong-content-type`.

---

### Timeout na requisição

**Sintoma:** Cliente recebe erro de timeout antes da resposta.

**Diagnóstico no ZAP:**
1. A requisição aparece no histórico (chegou ao servidor)?
2. O ZAP mostra o tempo de resposta na coluna **RTT**.
3. Endpoint para reproduzir: `GET /slow?ms=10000`.

**Causas comuns:**
- Servidor processando algo pesado.
- Problema de rede/DNS.
- Timeout do cliente muito baixo.

---

### Redirecionamento em loop

**Sintoma:** Cliente recebe 301 repetidamente.

**Diagnóstico no ZAP:**
1. Observe a sequência de requisições no histórico.
2. Verifique o header `Location` em cada 301.
3. Endpoint para reproduzir: `GET /redirect` (redireciona uma vez para `/`).

No Postman, em **Settings → General → Automatically follow redirects**, você pode desativar o seguimento automático para ver cada passo no ZAP.

---

## Dicas gerais de uso do ZAP

### Ver apenas erros (4xx / 5xx)

Na aba **History**: filtro por coluna **Code** → ordene por código descendente ou use Ctrl+F para buscar.

### Exportar histórico

**File → Export Context** ou use a API REST do ZAP:

```bash
curl "http://localhost:8080/JSON/core/view/messages/" | jq .
```

### Limpar o histórico

```bash
curl "http://localhost:8080/JSON/core/action/clearExcludedFromProxy/"
curl "http://localhost:8080/JSON/core/action/deleteAllAlerts/"
```

Ou reinicie o container ZAP: `docker compose restart zap`.

### Usar o ZAP com breakpoints (interceptar e editar)

1. Na ZAP Web UI, clique em **Breakpoints** → **Add**.
2. Configure URL e método.
3. Faça a requisição — o ZAP pausa antes de encaminhar.
4. Edite headers ou corpo e clique **Continue**.

Isso é útil para testar como a API reage a headers modificados ou tokens alterados.

---

## Fluxo de diagnóstico recomendado

Quando encontrar um problema em uma API, siga esta sequência no ZAP:

```
1. A requisição chegou ao servidor?
   └─ Não → problema de rede, proxy, DNS ou firewall
   └─ Sim → continue

2. Qual foi o status code?
   ├─ 2xx → sucesso; observe o corpo e os headers
   ├─ 3xx → redirecionamento; observe o header Location
   ├─ 4xx → erro do cliente; verifique auth, headers, corpo
   └─ 5xx → erro do servidor; logs do servidor são necessários

3. O Content-Type da resposta bate com o conteúdo?

4. Há headers de cache que podem estar servindo dados antigos?

5. Se for CORS: o header Access-Control-Allow-Origin está presente?

6. Se for auth: o token está no header correto e ainda é válido?
```

---

## Referências

- [OWASP ZAP Documentation](https://www.zaproxy.org/docs/)
- [JWT.io — Debugger de JWT](https://jwt.io)
- [HTTP Status Codes](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Status)
- [MDN — CORS](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/CORS)
