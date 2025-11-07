# 🚀 Como Implantar a Edge Function no Supabase

## Passo 1: Acessar o Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard/project/ybnobvonfxoqvlimfzpl/functions
2. Faça login com suas credenciais

## Passo 2: Criar a Edge Function

1. Clique no botão **"Create a new function"** ou **"New Edge Function"**
2. Preencha os campos:
   - **Nome:** `iot-ingest`
   - **Description (opcional):** `IoT sensor data ingestion endpoint for ESP32 devices`

## Passo 3: Colar o Código

1. Na área de código, **delete todo o conteúdo existente**
2. Abra o arquivo: `iot-monitor-app/supabase-edge-function-iot-ingest.ts`
3. **Copie TODO o código** desse arquivo
4. **Cole** na área de código da Edge Function

## Passo 4: Deploy

1. Clique no botão **"Deploy"** ou **"Save"**
2. Aguarde alguns segundos até aparecer a confirmação de sucesso
3. A URL da função será: `https://ybnobvonfxoqvlimfzpl.supabase.co/functions/v1/iot-ingest`

## Passo 5: Testar

Após o deploy, faça o upload do código `energia_temp.ino` para o ESP32 e aguarde:

- ✅ **HTTP Status: 200** = Sucesso!
- ❌ **HTTP Status: 404** = Edge Function não foi implantada corretamente
- ❌ **HTTP Status: 401** = API Key inválida
- ❌ **HTTP Status: 500** = Erro no servidor

## Verificar se a Edge Function está ativa

1. Vá para: https://supabase.com/dashboard/project/ybnobvonfxoqvlimfzpl/functions
2. Você deve ver a função `iot-ingest` na lista
3. Se estiver em vermelho ou offline, clique nela e faça o deploy novamente

## Troubleshooting

### "Function not found" (404)
- A função não foi criada ou não foi feito o deploy
- Verifique se o nome está correto: `iot-ingest` (sem espaços, tudo minúsculo)

### "Invalid API key" (401)
- A API key `iot_XzSw0pRPQolvrXu2St3t-dnxY-wJYhhn` não está registrada no banco
- Execute no SQL Editor do Supabase:
```sql
SELECT * FROM device_api_keys WHERE api_key = 'iot_XzSw0pRPQolvrXu2St3t-dnxY-wJYhhn';
```
- Se não retornar nada, crie uma nova API key:
```sql
SELECT generate_device_api_key('4b6d07de-007e-4bf5-a1f6-a3fdd08abf0e');
```

### "Database insertion failed" (500)
- Problema com as tabelas ou políticas RLS
- Verifique se a tabela `energy_readings` existe
- Verifique se as colunas estão corretas

## 📝 Código da Edge Function

O código completo está em: `iot-monitor-app/supabase-edge-function-iot-ingest.ts`

**IMPORTANTE:** A Edge Function usa a `SERVICE_ROLE_KEY` que **bypassa as políticas RLS**, por isso é seguro e funciona!
