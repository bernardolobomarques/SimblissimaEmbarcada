from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Q
from .models import EnergyReading
from .serializers import EnergyReadingSerializer


@api_view(['POST'])
def create_energy_reading(request):
    """
    Endpoint para receber dados do ESP8266
    Aceita POST com JSON: {"device_id": "string", "power_watts": float}
    """
    serializer = EnergyReadingSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save()
        return Response(
            {
                'message': 'Leitura salva com sucesso',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    return Response(
        {
            'message': 'Erro na validação dos dados',
            'errors': serializer.errors
        },
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(['GET'])
def get_energy_readings(request):
    """
    Endpoint para obter leituras de energia
    Aceita parâmetro: ?device_id=<ID>
    Retorna as 100 leituras mais recentes
    """
    device_id = request.GET.get('device_id')
    
    # Filtra por device_id se fornecido
    queryset = EnergyReading.objects.all()
    if device_id:
        queryset = queryset.filter(device_id=device_id)
    
    # Limita às 100 leituras mais recentes
    readings = queryset[:100]
    
    serializer = EnergyReadingSerializer(readings, many=True)
    
    return Response({
        'count': readings.count(),
        'device_id': device_id,
        'readings': serializer.data
    })


@api_view(['GET'])
def get_latest_reading(request):
    """
    Endpoint para obter a leitura mais recente
    Aceita parâmetro: ?device_id=<ID>
    """
    device_id = request.GET.get('device_id')
    
    # Filtra por device_id se fornecido
    queryset = EnergyReading.objects.all()
    if device_id:
        queryset = queryset.filter(device_id=device_id)
    
    # Pega a leitura mais recente
    latest_reading = queryset.first()
    
    if latest_reading:
        serializer = EnergyReadingSerializer(latest_reading)
        return Response({
            'latest_reading': serializer.data
        })
    
    return Response({
        'message': 'Nenhuma leitura encontrada',
        'latest_reading': None
    }, status=status.HTTP_404_NOT_FOUND)
