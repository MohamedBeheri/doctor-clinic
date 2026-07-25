from rest_framework.routers import DefaultRouter

from .views import PatientFileViewSet

router = DefaultRouter()
router.register('', PatientFileViewSet, basename='patient-file')

urlpatterns = router.urls
