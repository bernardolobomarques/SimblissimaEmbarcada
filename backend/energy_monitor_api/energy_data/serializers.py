from rest_framework import serializers
from .models import EnergyReading


class EnergyReadingSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo EnergyReading
    """
    
    class Meta:
        model = EnergyReading
        fields = ['id', 'device_id', 'power_watts', 'timestamp']
        read_only_fields = ['id', 'timestamp']
    
    def validate_power_watts(self, value):
        """
        Valida se o valor de potência é positivo
        """
        if value < 0:
            raise serializers.ValidationError("A potência deve ser um valor positivo.")
        return value
    
    def validate_device_id(self, value):
        """
        Valida se o device_id não está vazio
        """
        if not value or not value.strip():
            raise serializers.ValidationError("O device_id não pode estar vazio.")
        return value.strip()
