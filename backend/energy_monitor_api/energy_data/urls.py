from django.urls import path
from . import views

urlpatterns = [
    # Endpoint para receber dados do ESP8266
    path('readings/', views.create_energy_reading, name='create_energy_reading'),
    
    # Endpoint para obter leituras (para o frontend)
    path('readings/list/', views.get_energy_readings, name='get_energy_readings'),
    
    # Endpoint para obter a leitura mais recente
    path('readings/latest/', views.get_latest_reading, name='get_latest_reading'),
]
