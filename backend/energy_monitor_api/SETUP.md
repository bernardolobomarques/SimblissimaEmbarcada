# Instruções de Setup - EnergyMonitor API

## 1. Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- Python 3.8+
- PostgreSQL (ou SQLite para desenvolvimento local)

### Passos para configurar localmente:

1. **Navegue até a pasta do projeto:**
   ```bash
   cd backend/energy_monitor_api
   ```

2. **Crie um ambiente virtual:**
   ```bash
   python -m venv venv
   ```

3. **Ative o ambiente virtual:**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure as variáveis de ambiente:**
   ```bash
   # Copie o arquivo de exemplo
   copy .env.example .env
   
   # Edite o .env com suas configurações
   # Para desenvolvimento local, você pode usar SQLite alterando settings.py
   ```

6. **Execute as migrações:**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

7. **Crie um superusuário (opcional):**
   ```bash
   python manage.py createsuperuser
   ```

8. **Execute o servidor:**
   ```bash
   python manage.py runserver
   ```

## 2. Teste dos Endpoints

### Teste com curl ou Postman:

**Criar uma leitura:**
```bash
curl -X POST http://localhost:8000/api/v1/energy/readings/ \
  -H "Content-Type: application/json" \
  -d '{"device_id": "ESP8266_001", "power_watts": 150.75}'
```

**Listar leituras:**
```bash
curl http://localhost:8000/api/v1/energy/readings/list/
```

**Obter leitura mais recente:**
```bash
curl http://localhost:8000/api/v1/energy/readings/latest/
```

## 3. Deploy no Render

1. **Faça push do código para um repositório Git**
2. **Crie um novo Web Service no Render**
3. **Configure as seguintes variáveis de ambiente:**
   - `SECRET_KEY`: Uma chave secreta segura
   - `DEBUG`: `False`
   - `ALLOWED_HOST`: URL do seu app no Render
   - `DATABASE_NAME`: Nome do banco PostgreSQL
   - `DATABASE_USER`: Usuário do banco
   - `DATABASE_PASSWORD`: Senha do banco
   - `DATABASE_HOST`: Host do banco
   - `DATABASE_PORT`: `5432`

4. **O Render detectará automaticamente o Procfile e fará o deploy**

## 4. Estrutura dos Endpoints

- **POST /api/v1/energy/readings/**: Recebe dados do ESP8266
- **GET /api/v1/energy/readings/list/**: Lista leituras (com filtro opcional por device_id)
- **GET /api/v1/energy/readings/latest/**: Obtém a leitura mais recente
- **GET /admin/**: Interface administrativa do Django

## 5. Próximos Passos

1. **Desenvolver o frontend** para consumir estas APIs
2. **Implementar o código do ESP8266** para enviar dados
3. **Adicionar autenticação** se necessário
4. **Implementar cache** para melhorar performance
5. **Adicionar logs** para monitoramento
