# EnergyMonitor API

API REST para monitoramento de consumo de energia usando Django REST Framework.

## Estrutura do Projeto

```
energy_monitor_api/
├── manage.py
├── requirements.txt
├── Procfile
├── .env.example
├── core/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── energy_data/
    ├── __init__.py
    ├── migrations/
    ├── models.py
    ├── serializers.py
    ├── views.py
    ├── urls.py
    └── admin.py
```

## Configuração Local

1. Instale as dependências:
```bash
pip install -r requirements.txt
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

3. Execute as migrações:
```bash
python manage.py makemigrations
python manage.py migrate
```

4. Crie um superusuário (opcional):
```bash
python manage.py createsuperuser
```

5. Execute o servidor de desenvolvimento:
```bash
python manage.py runserver
```

## Endpoints da API

### POST /api/v1/energy/readings/
Recebe dados do ESP8266.

**Payload:**
```json
{
    "device_id": "ESP8266_001",
    "power_watts": 150.75
}
```

### GET /api/v1/energy/readings/list/
Lista leituras de energia (até 100 mais recentes).

**Parâmetros opcionais:**
- `device_id`: Filtra por dispositivo específico

### GET /api/v1/energy/readings/latest/
Obtém a leitura mais recente.

**Parâmetros opcionais:**
- `device_id`: Filtra por dispositivo específico

## Deploy no Render

1. Crie um novo Web Service no Render
2. Conecte seu repositório Git
3. Configure as variáveis de ambiente no painel do Render
4. O deploy será feito automaticamente usando o Procfile

### Variáveis de Ambiente no Render

- `SECRET_KEY`: Chave secreta do Django
- `DEBUG`: False para produção
- `ALLOWED_HOST`: URL do seu app no Render
- `DATABASE_NAME`: Nome do banco PostgreSQL
- `DATABASE_USER`: Usuário do banco
- `DATABASE_PASSWORD`: Senha do banco
- `DATABASE_HOST`: Host do banco
- `DATABASE_PORT`: Porta do banco (padrão: 5432)

## Modelo de Dados

### EnergyReading
- `device_id`: CharField - Identificador do dispositivo
- `power_watts`: FloatField - Potência em Watts
- `timestamp`: DateTimeField - Data/hora da leitura (automático)

## Uso com ESP8266

O ESP8266 deve fazer requisições POST para o endpoint `/api/v1/energy/readings/` com o seguinte formato:

```cpp
// Exemplo de payload para o ESP8266
{
  "device_id": "ESP8266_001",
  "power_watts": 125.50
}
```
