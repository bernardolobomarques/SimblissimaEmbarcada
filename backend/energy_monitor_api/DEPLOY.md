# 🚀 Deploy no Render - EnergyMonitor API

## ✅ **Pré-requisitos Completos**

Todos os arquivos necessários já estão criados:
- ✅ `requirements.txt` - Dependências Python
- ✅ `Procfile` - Comando de inicialização
- ✅ `build.sh` - Script de build
- ✅ `render.yaml` - Configuração automática
- ✅ `.env.example` - Exemplo de variáveis

## 🔧 **Passos para Deploy**

### **1. Preparar Repositório Git**

```bash
# No terminal, execute:
git add .
git commit -m "Deploy: EnergyMonitor API para Render"
git push origin main
```

### **2. Criar Conta no Render**

1. Acesse: https://render.com
2. Faça login com GitHub
3. Conecte seu repositório

### **3. Criar Web Service**

1. **Dashboard Render** → "New +" → "Web Service"
2. **Connect Repository** → Selecione: `SimblissimaEmbarcada`
3. **Configurações:**
   - **Name**: `energymonitor-api`
   - **Environment**: `Python 3`
   - **Build Command**: `./build.sh`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT core.wsgi`
   - **Root Directory**: `backend/energy_monitor_api`

### **4. Configurar Variáveis de Ambiente**

No painel do Render, adicione estas variáveis:

```
SECRET_KEY = [Gerar uma chave secreta forte]
DEBUG = False
ALLOWED_HOST = [URL-do-seu-app].onrender.com
DATABASE_URL = [Será preenchido automaticamente pelo PostgreSQL]
```

### **5. Adicionar PostgreSQL Database**

1. **Dashboard** → "New +" → "PostgreSQL"
2. **Name**: `energymonitor-db`
3. **Plan**: Free
4. Após criar, copie a `DATABASE_URL`

### **6. Conectar Database ao Web Service**

Na configuração do Web Service:
1. **Environment Variables**
2. Adicionar: `DATABASE_URL = [cola-a-url-do-postgres]`

## 🎯 **URLs Finais**

Após deploy:
- **API Base**: `https://energymonitor-api.onrender.com`
- **Admin**: `https://energymonitor-api.onrender.com/admin/`
- **Endpoints**:
  - POST: `/api/v1/energy/readings/`
  - GET: `/api/v1/energy/readings/list/`
  - GET: `/api/v1/energy/readings/latest/`

## 🧪 **Testar Deploy**

```bash
# Teste básico
curl https://energymonitor-api.onrender.com/api/v1/energy/readings/list/

# Enviar dados (simular ESP8266)
curl -X POST https://energymonitor-api.onrender.com/api/v1/energy/readings/ \
  -H "Content-Type: application/json" \
  -d '{"device_id": "ESP8266_001", "power_watts": 150.75}'
```

## ⚠️ **Notas Importantes**

1. **Primeira Build**: Pode demorar 5-10 minutos
2. **Logs**: Acompanhe no painel do Render
3. **Sleep Mode**: Apps gratuitos "dormem" após 15min sem uso
4. **Cold Start**: Primeira requisição pode demorar ~30s

## 🔑 **Variáveis de Ambiente Necessárias**

```env
SECRET_KEY=sua-chave-secreta-super-forte
DEBUG=False
ALLOWED_HOST=energymonitor-api.onrender.com
DATABASE_URL=postgres://user:pass@host:port/dbname
```

## 📱 **Para o ESP8266**

Após deploy, configure o ESP8266 para enviar para:
```cpp
const char* serverURL = "https://energymonitor-api.onrender.com/api/v1/energy/readings/";
```

**Status**: ✅ Projeto pronto para deploy!
