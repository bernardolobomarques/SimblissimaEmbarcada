from django.db import models
from django.utils import timezone


class EnergyReading(models.Model):
    """
    Modelo para armazenar leituras de consumo de energia
    """
    device_id = models.CharField(
        max_length=100,
        help_text="Identificador único do dispositivo ESP8266"
    )
    power_watts = models.FloatField(
        help_text="Leitura de potência em Watts"
    )
    timestamp = models.DateTimeField(
        default=timezone.now,
        help_text="Data e hora da leitura"
    )

    class Meta:
        verbose_name = "Leitura de Energia"
        verbose_name_plural = "Leituras de Energia"
        ordering = ['-timestamp']  # Ordena por timestamp mais recente primeiro

    def __str__(self):
        return f"{self.device_id} - {self.power_watts}W - {self.timestamp}"
