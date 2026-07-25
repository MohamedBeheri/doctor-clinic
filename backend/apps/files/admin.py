from django.contrib import admin

from .models import PatientFile


@admin.register(PatientFile)
class PatientFileAdmin(admin.ModelAdmin):
    list_display = ('patient', 'title', 'category', 'uploaded_at')
    list_filter = ('category',)
