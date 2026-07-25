from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class ClinicUserAdmin(UserAdmin):
    list_display = ('username', 'full_name', 'role', 'phone', 'is_active')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'full_name', 'phone')
    fieldsets = UserAdmin.fieldsets + (
        ('بيانات العيادة', {'fields': ('role', 'full_name', 'phone', 'specialty')}),
    )
