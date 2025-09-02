from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from .models import EnergyReading
import json


class EnergyReadingModelTest(TestCase):
    """Testes para o modelo EnergyReading"""
    
    def test_create_energy_reading(self):
        """Testa a criação de uma leitura de energia"""
        reading = EnergyReading.objects.create(
            device_id="ESP8266_TEST",
            power_watts=100.5
        )
        self.assertEqual(reading.device_id, "ESP8266_TEST")
        self.assertEqual(reading.power_watts, 100.5)
        self.assertIsNotNone(reading.timestamp)
    
    def test_string_representation(self):
        """Testa a representação string do modelo"""
        reading = EnergyReading.objects.create(
            device_id="ESP8266_TEST",
            power_watts=100.5
        )
        self.assertIn("ESP8266_TEST", str(reading))
        self.assertIn("100.5W", str(reading))


class EnergyReadingAPITest(APITestCase):
    """Testes para a API de leituras de energia"""
    
    def test_create_energy_reading_api(self):
        """Testa o endpoint de criação de leitura"""
        url = reverse('create_energy_reading')
        data = {
            'device_id': 'ESP8266_TEST',
            'power_watts': 125.75
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EnergyReading.objects.count(), 1)
        self.assertEqual(EnergyReading.objects.get().device_id, 'ESP8266_TEST')
    
    def test_create_energy_reading_invalid_data(self):
        """Testa o endpoint com dados inválidos"""
        url = reverse('create_energy_reading')
        data = {
            'device_id': '',
            'power_watts': -10  # Valor negativo não permitido
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(EnergyReading.objects.count(), 0)
    
    def test_get_energy_readings_api(self):
        """Testa o endpoint de listagem de leituras"""
        # Cria algumas leituras de teste
        EnergyReading.objects.create(device_id="ESP8266_TEST", power_watts=100)
        EnergyReading.objects.create(device_id="ESP8266_TEST", power_watts=200)
        
        url = reverse('get_energy_readings')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['count'], 2)
        self.assertEqual(len(data['readings']), 2)
    
    def test_get_latest_reading_api(self):
        """Testa o endpoint de leitura mais recente"""
        reading = EnergyReading.objects.create(
            device_id="ESP8266_TEST", 
            power_watts=150
        )
        
        url = reverse('get_latest_reading')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['latest_reading']['device_id'], 'ESP8266_TEST')
        self.assertEqual(data['latest_reading']['power_watts'], 150)
