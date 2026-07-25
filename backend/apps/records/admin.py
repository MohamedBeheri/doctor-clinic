from django.contrib import admin

from .models import TreatmentRecord


@admin.register(TreatmentRecord)
class TreatmentRecordAdmin(admin.ModelAdmin):
    list_display = ('patient', 'dentist', 'cost', 'created_at')
    list_filter = ('dentist',)
    search_fields = ('patient__full_name', 'diagnosis')
