from rest_framework.routers import DefaultRouter

from .views import PlanTemplateViewSet, TreatmentPlanViewSet, TreatmentRecordViewSet

router = DefaultRouter()
router.register('plans', TreatmentPlanViewSet, basename='treatment-plan')
router.register('plan-templates', PlanTemplateViewSet, basename='plan-template')
router.register('', TreatmentRecordViewSet, basename='record')

urlpatterns = router.urls
