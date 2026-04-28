# 03 — TLS e Certificados: inspecionando HTTPS com o ZAP

Quando a API usa HTTPS, o ZAP precisa de um certificado CA próprio para poder descriptografar o tráfego e exibi-lo. Esse processo é chamado de **TLS interception** (ou "man-in-the-middle autorizado").

> **Importante:** Este processo é válido **apenas em ambiente local/lab** onde você controla tanto o cliente quanto o servidor. Nunca faça isso em conexões de terceiros sem autorização.

---

## Como funciona

```
[cliente] ──TLS──> [ZAP :8090] ──TLS──> [servidor]
                     ↑
          ZAP emite um certificado falso
          assinado pela CA do ZAP.
          O cliente precisa confiar nessa CA.
```

O ZAP gera dinamicamente um certificado para cada domínio, assinado pela sua própria CA. Para que o cliente não receba erro de TLS, você precisa **importar o certificado CA do ZAP** no cliente ou no sistema operacional.

---

## 1. Exportar o certificado CA do ZAP

### Via ZAP Web UI

1. Acesse **http://localhost:8080**.
2. Menu **Tools → Options → Network → Server Certificates**.
3. Clique em **Save** para salvar o arquivo `owasp_zap_root_ca.cer`.

### Via API REST do ZAP

```bash
curl -o zap-ca.cer "http://localhost:8080/OTHER/core/other/rootcert/"
```

O arquivo `zap-ca.cer` é o certificado CA em formato PEM.

---

## 2. Importar o certificado no sistema/cliente

### macOS

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain zap-ca.cer
```

### Linux (Ubuntu/Debian)

```bash
sudo cp zap-ca.cer /usr/local/share/ca-certificates/zap-ca.crt
sudo update-ca-certificates
```

### Windows

1. Clique duplo em `zap-ca.cer`.
2. **Instalar Certificado → Computador Local → Autoridades de Certificação Raiz Confiáveis**.

### Postman

1. **Settings → Certificates → CA Certificates**.
2. Ative e selecione o arquivo `zap-ca.cer`.

### curl

```bash
curl --cacert zap-ca.cer -x http://localhost:8090 https://localhost:3000/
```

Ou exporte para a sessão:

```bash
export CURL_CA_BUNDLE=zap-ca.cer
```

---

## 3. Exercício — Observar HTTPS no ZAP

> Para este exercício é necessário uma API com HTTPS. A API deste lab roda em HTTP por padrão para simplificar. Se quiser testar HTTPS, use qualquer serviço HTTPS público **em ambiente de teste** ou configure um certificado local com [mkcert](https://github.com/FiloSottile/mkcert).

### Cenário: API de terceiros (ambiente de teste)

1. Configure o Postman para usar o proxy `localhost:8090`.
2. Importe o certificado CA do ZAP no Postman (passo 2 acima).
3. Faça uma requisição para `https://httpbin.org/get`.
4. No ZAP, observe a requisição HTTPS descriptografada:
   - Headers completos (incluindo `Authorization` se presente).
   - Corpo da resposta.

---

## 4. Erros comuns de TLS

| Erro | Causa provável | Solução |
|---|---|---|
| `SSL certificate verify failed` | CA do ZAP não confiada pelo cliente | Importe o certificado (passo 2) |
| `ERR_CERT_AUTHORITY_INVALID` | Browser não confia na CA do ZAP | Importe no sistema operacional |
| `certificate has expired` | Certificado de um servidor real expirado | Anote a data no ZAP → aba **Alerts** |
| `CN mismatch` | Hostname não bate com o certificado | Observe o campo `Subject` no ZAP |

---

## 5. Remover o certificado após o lab

Após terminar o laboratório, remova o certificado CA do ZAP do seu sistema para manter a segurança:

- **macOS:** Keychain Access → encontre "OWASP ZAP Root CA" → Delete.
- **Linux:** `sudo rm /usr/local/share/ca-certificates/zap-ca.crt && sudo update-ca-certificates`.
- **Windows:** `certmgr.msc` → Autoridades de Certificação Raiz Confiáveis → Remover.

---

## Próximos passos

- [04 — CORS](./04-cors.md)
- [05 — Auth e JWT](./05-auth-jwt.md)
