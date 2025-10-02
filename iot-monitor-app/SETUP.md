# 🚀 INSTRUÇÕES DE SETUP - IoT Monitor App

## ⚠️ IMPORTANTE: Siga estes passos na ordem

### 1️⃣ Instalar Dependências

Navegue até a pasta do projeto e instale as dependências:

```bash
cd iot-monitor-app
npm install
```

### 2️⃣ Configurar Supabase

#### 2.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Crie um novo projeto na região `sa-east-1` (São Paulo)
4. Anote a URL e a chave `anon` do projeto

#### 2.2 Atualizar Configuração
Edite o arquivo `src/constants/config.ts` e substitua `YOUR_SUPABASE_ANON_KEY`:

```typescript
export const SUPABASE_CONFIG = {
  url: 'https://ybnobvonfxoqv1iafzpl.supabase.co',
  anonKey: 'SUA_CHAVE_ANON_AQUI', // Copiar do dashboard do Supabase
  region: 'sa-east-1',
}
```

#### 2.3 Criar Tabelas no Banco de Dados
No Supabase Dashboard, vá em **SQL Editor** e execute este script:

```sql
-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de dispositivos
CREATE TABLE devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('energy', 'water')),
  device_name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'online',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leituras de energia
CREATE TABLE energy_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_rms NUMERIC(10, 4),
  voltage NUMERIC(10, 2),
  power_watts NUMERIC(10, 2),
  energy_kwh NUMERIC(10, 4),
  appliance_name TEXT
);

-- Tabela de leituras de água
CREATE TABLE water_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  distance_cm NUMERIC(10, 2),
  water_level_percent NUMERIC(5, 2),
  volume_liters NUMERIC(10, 2),
  tank_height_cm NUMERIC(10, 2) DEFAULT 100,
  tank_capacity_liters NUMERIC(10, 2) DEFAULT 1000
);

-- Tabela de alertas
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Índices para performance
CREATE INDEX idx_energy_readings_device_timestamp ON energy_readings(device_id, timestamp DESC);
CREATE INDEX idx_water_readings_device_timestamp ON water_readings(device_id, timestamp DESC);
CREATE INDEX idx_alerts_user_created ON alerts(user_id, created_at DESC);

-- Habilitar Realtime (IMPORTANTE!)
ALTER PUBLICATION supabase_realtime ADD TABLE energy_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE water_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;

-- Inserir dados de teste
INSERT INTO energy_readings (device_id, voltage, current_rms, power_watts)
VALUES 
  ('esp8266_energy_01', 127, 5.5, 698.5),
  ('esp8266_energy_01', 127, 6.2, 787.4),
  ('esp8266_energy_01', 127, 4.8, 609.6);

INSERT INTO water_readings (device_id, distance_cm, water_level_percent, volume_liters)
VALUES 
  ('esp8266_water_01', 30, 70, 700),
  ('esp8266_water_01', 35, 65, 650),
  ('esp8266_water_01', 28, 72, 720);
```

#### 2.4 Configurar Autenticação
No Supabase Dashboard:
1. Vá em **Authentication** > **Providers**
2. Habilite **Email** como provider
3. Desabilite "Confirm Email" para testes (opcional)

### 3️⃣ Executar o Aplicativo

```bash
npm start
```

Opções:
- Pressione `a` para Android
- Pressione `i` para iOS (apenas macOS)
- Pressione `w` para Web
- Escaneie o QR code com o app Expo Go no seu celular

### 4️⃣ Criar Conta de Teste

1. Ao abrir o app, clique em "Criar conta"
2. Preencha os dados:
   - Nome: Teste
   - Email: teste@example.com
   - Senha: 123456
3. Clique em "Criar Conta"
4. Volte e faça login

### 5️⃣ Verificar Funcionamento

✅ **Dashboard** deve mostrar:
- Card de Energia com última leitura
- Card de Água com último nível
- Status dos dispositivos

✅ **Tela de Energia** deve mostrar:
- Potência atual
- Consumo do dia
- Gráfico de leituras

✅ **Tela de Água** deve mostrar:
- Nível percentual
- Volume em litros
- Visualização do tanque
- Gráfico de histórico

✅ **Tela de Alertas** deve mostrar:
- Lista de notificações (se houver)

## 🔧 Solução de Problemas

### Erro de conexão com Supabase
- Verifique se a URL e chave estão corretas
- Verifique sua conexão com internet
- Confirme que o projeto Supabase está ativo

### Dados não aparecem
- Verifique se as tabelas foram criadas
- Verifique se há dados de teste inseridos
- Confira os logs do console para erros

### App não inicia
```bash
# Limpar cache
npm start -- --clear

# Reinstalar dependências
rm -rf node_modules
npm install
```

### Erro de TypeScript
Os erros de TypeScript são esperados até que você execute `npm install`. Depois disso, o compilador reconhecerá todos os módulos.

## 📱 Instalando no Celular

1. Instale o app **Expo Go**:
   - [Android - Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

2. Execute `npm start`

3. Escaneie o QR code:
   - Android: Use o Expo Go direto
   - iOS: Use a câmera nativa do iOS

## 🎯 Próximos Passos

1. ✅ App funcionando localmente
2. 🔌 Conectar ESP8266 para enviar dados reais
3. 🔔 Configurar notificações push
4. 📊 Adicionar mais gráficos e análises
5. 🚀 Fazer build para produção com `eas build`

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique o README.md principal
2. Consulte a documentação do [Expo](https://docs.expo.dev)
3. Consulte a documentação do [Supabase](https://supabase.com/docs)

---

**Boa sorte com seu projeto IoT! ⚡💧**
