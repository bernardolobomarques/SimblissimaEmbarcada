import requests
import json

# URL base da API
BASE_URL = "http://127.0.0.1:8000/api/v1/energy"

def test_get_readings():
    """Testa o endpoint de listagem de leituras"""
    try:
        response = requests.get(f"{BASE_URL}/readings/list/")
        print(f"GET /readings/list/ - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response
    except Exception as e:
        print(f"Erro ao testar GET: {e}")
        return None

def test_post_reading():
    """Testa o endpoint de criação de leitura"""
    try:
        data = {
            "device_id": "ESP8266_TEST_001",
            "power_watts": 125.75
        }
        response = requests.post(
            f"{BASE_URL}/readings/",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"POST /readings/ - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response
    except Exception as e:
        print(f"Erro ao testar POST: {e}")
        return None

def test_get_latest():
    """Testa o endpoint de leitura mais recente"""
    try:
        response = requests.get(f"{BASE_URL}/readings/latest/")
        print(f"GET /readings/latest/ - Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response
    except Exception as e:
        print(f"Erro ao testar GET latest: {e}")
        return None

if __name__ == "__main__":
    print("=== Testando API EnergyMonitor ===\n")
    
    print("1. Testando listagem de leituras (deve estar vazio):")
    test_get_readings()
    print()
    
    print("2. Criando uma nova leitura:")
    test_post_reading()
    print()
    
    print("3. Testando listagem novamente (deve ter 1 item):")
    test_get_readings()
    print()
    
    print("4. Testando leitura mais recente:")
    test_get_latest()
    print()
    
    print("5. Criando mais algumas leituras:")
    for i in range(3):
        data = {
            "device_id": f"ESP8266_TEST_{i+2:03d}",
            "power_watts": 100 + (i * 25)
        }
        response = requests.post(
            f"{BASE_URL}/readings/",
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        print(f"  Leitura {i+2}: {response.status_code}")
    
    print()
    print("6. Listagem final:")
    test_get_readings()
