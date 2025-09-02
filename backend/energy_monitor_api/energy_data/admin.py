from django.contrib import admin
from .models import EnergyReading


@admin.register(EnergyReading)
class EnergyReadingAdmin(admin.ModelAdmin):
    """
    Configuração do admin para EnergyReading
    """
    list_display = ['device_id', 'power_watts', 'timestamp']
    list_filter = ['device_id', 'timestamp']
    search_fields = ['device_id']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']
    
    # Configura quantos itens mostrar por página
    list_per_page = 50
