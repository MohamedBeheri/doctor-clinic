from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('patient', 'dentist', 'scheduled_at', 'status')
    list_filter = ('status', 'dentist')
    search_fields = ('patient__full_name', 'patient__file_number')
    date_hierarchy = 'scheduled_at'
