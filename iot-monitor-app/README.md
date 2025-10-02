# 📱 IoT Monitor App

**Aplicativo Unificado de Monitoramento de Energia e Água**

Desenvolvido para o Simpósio Brasileiro de Telecomunicações (SBrT) 2025 no IBMEC-RJ.

## 🚀 Sobre o Projeto

O IoT Monitor é um aplicativo React Native que unifica dois sistemas IoT independentes:

1. **Monitoramento de Energia Elétrica** - ESP8266 + Sensor ACS712
2. **Monitoramento de Nível de Água** - ESP8266 + Sensor Ultrassônico HC-SR04

### ✨ Funcionalidades Principais

- ⚡ **Monitoramento de Energia em Tempo Real**
  - Potência instantânea (Watts)
  - Consumo acumulado (kWh)
  - Custo estimado
  - Gráficos históricos
  - Alertas de consumo alto

- 💧 **Monitoramento de Água em Tempo Real**
  - Nível percentual do reservatório
  - Volume em litros
  - Visualização animada do tanque
  - Gráficos de variação
  - Alertas de nível baixo/crítico

- 🔔 **Sistema de Alertas**
  - Notificações push
  - Histórico de alertas
  - Severidade visual (crítico/atenção/info)

- ⚙️ **Configurações**
  - Gerenciamento de perfil
  - Configuração de dispositivos
  - Ajuste de tarifas

## 🛠️ Stack Tecnológico

- **Frontend**: React Native 0.72 + Expo SDK 49
- **Linguagem**: TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime)
- **UI**: React Native Paper (Material Design)
- **Navegação**: React Navigation v6
- **Gráficos**: React Native Chart Kit
- **Notificações**: Expo Notifications

## 📦 Instalação

### Pré-requisitos

- Node.js 16+ e npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Conta no Supabase (gratuita)

### Passo a Passo

1. **Clone o repositório**
```bash
cd iot-monitor-app
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Supabase**

Edite `src/constants/config.ts` e adicione suas credenciais:

```typescript
export const SUPABASE_CONFIG = {
  url: 'https://ybnobvonfxoqv1iafzpl.supabase.co',
  anonKey: 'SUA_CHAVE_AQUI', // Obter no dashboard do Supabase
  region: 'sa-east-1',
}
```

4. **Crie as tabelas no Supabase**

Execute os seguintes SQLs no SQL Editor do Supabase:

```sql
-- Tabela de dispositivos
CREATE TABLE devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('energy', 'water')),
  device_name TEXT NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de leituras de energia
CREATE TABLE energy_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_rms NUMERIC(10, 4),
  voltage NUMERIC(10, 2),
  power_watts NUMERIC(10, 2),
  energy_kwh NUMERIC(10, 4)
);

-- Tabela de leituras de água
CREATE TABLE water_readings (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  distance_cm NUMERIC(10, 2),
  water_level_percent NUMERIC(5, 2),
  volume_liters NUMERIC(10, 2),
  tank_height_cm NUMERIC(10, 2),
  tank_capacity_liters NUMERIC(10, 2)
);

-- Tabela de alertas
CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE energy_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE water_readings;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
```

5. **Inicie o aplicativo**

```bash
npm start
```

Use o Expo Go no seu smartphone ou pressione:
- `a` para Android
- `i` para iOS (apenas macOS)
- `w` para Web

## 📱 Telas do Aplicativo

1. **Login/Registro** - Autenticação de usuários
2. **Dashboard** - Visão geral de todos os sistemas
3. **Energia** - Monitoramento detalhado de energia
4. **Água** - Monitoramento detalhado de água
5. **Alertas** - Notificações e alertas
6. **Configurações** - Perfil e ajustes

## 🔌 Integração com Hardware

### ESP8266 - Energia (ACS712)

```cpp
// Exemplo de código para enviar dados ao Supabase
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "SUA_REDE";
const char* password = "SUA_SENHA";
String supabaseUrl = "https://ybnobvonfxoqv1iafzpl.supabase.co/rest/v1/energy_readings";
String supabaseKey = "SUA_CHAVE";

void sendReading(float power) {
  HTTPClient http;
  http.begin(supabaseUrl);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", supabaseKey);
  
  String json = "{\"device_id\":\"esp01\",\"power_watts\":" + String(power) + "}";
  http.POST(json);
  http.end();
}
```

### ESP8266 - Água (HC-SR04)

```cpp
// Similar ao exemplo acima, mas enviando para water_readings
```

## 📊 Estrutura do Projeto

```
iot-monitor-app/
├── src/
│   ├── components/      # Componentes reutilizáveis
│   ├── screens/         # Telas do app
│   ├── navigation/      # Configuração de rotas
│   ├── services/        # Serviços e API
│   ├── hooks/           # Custom hooks
│   ├── types/           # TypeScript types
│   ├── utils/           # Funções utilitárias
│   └── constants/       # Constantes e config
├── assets/              # Imagens e recursos
├── App.tsx              # Entry point
├── package.json
└── README.md
```

## 🤝 Contribuindo

Este projeto foi desenvolvido para fins acadêmicos. Sugestões e melhorias são bem-vindas!

## 📄 Licença

Projeto acadêmico - SBrT 2025 IBMEC-RJ

## 👥 Autores

Desenvolvido para o Simpósio Brasileiro de Telecomunicações e Aplicações (SBrT) 2025

## 🙏 Agradecimentos

- IBMEC-RJ
- SBrT 2025
- Comunidade React Native
- Supabase

---

**⚡💧 Monitoramento Inteligente de Energia e Água**
