from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BranchViewSet, ClinicBrandingView, ClinicSettingsView, VisitTypeViewSet

router = DefaultRouter()
router.register('branches', BranchViewSet, basename='branch')
router.register('visit-types', VisitTypeViewSet, basename='visit-type')

urlpatterns = [
    path('settings/', ClinicSettingsView.as_view(), name='clinic-settings'),
    path('branding/', ClinicBrandingView.as_view(), name='clinic-branding'),
] + router.urls
