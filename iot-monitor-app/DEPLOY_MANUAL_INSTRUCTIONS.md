# 🚀 Guia de Deploy Manual - Edge Function IoT Ingest

## Pré-requisitos
✅ Migration SQL já aplicada no banco de dados  
✅ Acesso ao Dashboard do Supabase

---

## 📝 Passo a Passo: Deploy da Edge Function

### 1️⃣ Acessar Edge Functions no Dashboard

1. Abra seu navegador e acesse:
   ```
   https://supabase.com/dashboard/project/ybnobvonfxoqvlimfzpl/functions
   ```

2. Faça login se necessário

### 2️⃣ Criar Nova Edge Function

1. Clique no botão **"Create a new function"** (ou **"New Function"**)

2. Na tela de criação, preencha:
   - **Function name**: `iot-ingest`
   - **Description** (opcional): `IoT sensor data ingestion endpoint for ESP32 devices`

3. **NÃO clique em "Create" ainda!**

### 3️⃣ Copiar o Código da Função

1. Abra o arquivo: `supabase/functions/iot-ingest/index.ts` (no seu VS Code)

2. **Copie TODO o conteúdo** do arquivo (Ctrl+A, Ctrl+C)

3. **Cole no editor de código** no Dashboard do Supabase

### 4️⃣ Deploy da Função

1. Clique em **"Deploy function"** ou **"Create and deploy"**

2. Aguarde o deploy (geralmente leva 10-30 segundos)

3. Você verá uma mensagem de sucesso! ✅

### 5️⃣ Verificar URL da Edge Function

A URL da sua Edge Function será:
```
https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest
```

---

## 🧪 Testar a Edge Function

### Teste 1: Verificar se está online

No terminal do PowerShell, execute:

```powershell
curl -i --location --request OPTIONS 'https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest'
```

**Resposta esperada**: HTTP 200 OK

### Teste 2: Testar com dados de energia (requer API Key)

Primeiro, você precisa gerar uma API Key para seu dispositivo:

1. Vá para o SQL Editor no Supabase
2. Execute esta query (substitua `<SEU_DEVICE_ID>` pelo UUID do seu dispositivo):

```sql
SELECT generate_device_api_key('<SEU_DEVICE_ID>');
```

3. Copie a API Key gerada (começa com `iot_`)

4. Teste a função:

```powershell
curl -i --location --request POST 'https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest' `
  --header 'Authorization: Bearer iot_xxxxx' `
  --header 'X-Device-Type: energy' `
  --header 'Content-Type: application/json' `
  --data '{\"device_id\":\"<SEU_DEVICE_ID>\",\"timestamp\":\"2025-11-06T14:00:00-03:00\",\"readings\":{\"current_rms\":5.2,\"voltage\":127,\"power_watts\":660}}'
```

**Resposta esperada**: 
```json
{
  "success": true,
  "message": "Energy reading recorded successfully",
  "reading_id": "..."
}
```

---

## 🔍 Monitorar Logs

1. No Dashboard do Supabase, vá para:
   ```
   https://supabase.com/dashboard/project/ybnobvonfxoqvlimfzpl/functions/iot-ingest/logs
   ```

2. Aqui você verá:
   - Todas as requisições recebidas
   - Erros (se houver)
   - Status codes
   - Tempo de execução

---

## ✅ Checklist de Validação

Após o deploy, verifique:

- [ ] Edge Function aparece na lista de funções no Dashboard
- [ ] Status da função está **"Active"** ou **"Deployed"**
- [ ] Teste CORS (OPTIONS) retorna 200 OK
- [ ] Consegue gerar API Key via SQL
- [ ] Teste POST com dados de energia funciona
- [ ] Dados aparecem na tabela `energy_readings`
- [ ] Logs mostram requisições sem erros

---

## 🆘 Troubleshooting

### Erro: "Invalid or missing API key"
- Certifique-se de que gerou a API Key usando `generate_device_api_key()`
- Verifique se a API Key está no formato correto: `Bearer iot_xxxx`

### Erro: "Device not found"
- Verifique se o `device_id` existe na tabela `devices`
- Confirme que o dispositivo está ativo (`is_active = true`)

### Erro: "Database insertion failed"
- Verifique se a migration SQL foi aplicada corretamente
- Confirme que as novas colunas existem nas tabelas

### Função não aparece no Dashboard
- Tente fazer logout e login novamente
- Limpe o cache do navegador (Ctrl+Shift+Delete)
- Verifique se você está no projeto correto

---

## 🔄 Atualizar a Edge Function

Se precisar fazer alterações:

1. Acesse o Dashboard > Functions > `iot-ingest`
2. Clique em **"Edit function"**
3. Faça as alterações no código
4. Clique em **"Deploy"** novamente

---

## 📊 Próximos Passos

Após o deploy bem-sucedido:

1. ✅ **Gerar API Keys** para todos os seus dispositivos ESP32
2. ✅ **Atualizar código do ESP32** com a nova URL e API Key
3. ✅ **Testar integração** completa ESP32 → Edge Function → Supabase
4. ✅ **Monitorar logs** para garantir que tudo está funcionando

---

## 📞 Suporte

Se encontrar problemas:
- Verifique os logs da Edge Function no Dashboard
- Consulte a documentação: https://supabase.com/docs/guides/functions
- Teste as queries SQL manualmente no SQL Editor

**Projeto ID**: `ybnobvonfxoqvlimfzpl`  
**Região**: `sa-east-1`
