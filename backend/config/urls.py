from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.static import serve

from django.conf import settings

from .views import (
    dashboard_stats, dentist_report, doctor_day_statement,
    notifications, patient_report, reports_summary,
)


def spa(request, *args, **kwargs):
    """Serve the built SPA's index.html for any non-API route (client-side routing)."""
    index = settings.FRONTEND_DIR / 'index.html'
    if not index.exists():
        raise Http404('Frontend build not found')
    return FileResponse(open(index, 'rb'))


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include([
        path('dashboard/stats/', dashboard_stats, name='dashboard_stats'),
        path('notifications/', notifications, name='notifications'),
        path('reports/summary/', reports_summary, name='reports_summary'),
        path('reports/patient/<int:pk>/', patient_report, name='patient_report'),
        path('reports/dentist/<int:pk>/', dentist_report, name='dentist_report'),
        path('reports/doctor-day/', doctor_day_statement, name='doctor_day_statement'),
        path('auth/', include('apps.users.urls')),
        path('clinic/', include('apps.clinic.urls')),
        path('patients/', include('apps.patients.urls')),
        path('appointments/', include('apps.appointments.urls')),
        path('records/', include('apps.records.urls')),
        path('billing/', include('apps.billing.urls')),
        path('prescriptions/', include('apps.prescriptions.urls')),
        path('files/', include('apps.files.urls')),
        path('inventory/', include('apps.inventory.urls')),
        path('finance/', include('apps.finance.urls')),
        path('chatbot/', include('apps.chatbot.urls')),
    ])),
    # Media served by Django in all modes (uploads: logo, patient files).
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    # SPA catch-all: everything that's not api/admin/media/static/assets → index.html
    re_path(r'^(?!api/|admin/|media/|static/|assets/).*$', spa, name='spa'),
]
