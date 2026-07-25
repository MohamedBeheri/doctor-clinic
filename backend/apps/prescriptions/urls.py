from rest_framework.routers import DefaultRouter

from .views import DrugViewSet, PrescriptionViewSet

router = DefaultRouter()
router.register('drugs', DrugViewSet, basename='drug')
router.register('', PrescriptionViewSet, basename='prescription')

urlpatterns = router.urls
