from rest_framework.routers import DefaultRouter

from .views import InstallmentViewSet, InvoiceViewSet, PaymentViewSet

router = DefaultRouter()
router.register('invoices', InvoiceViewSet, basename='invoice')
router.register('payments', PaymentViewSet, basename='payment')
router.register('installments', InstallmentViewSet, basename='installment')

urlpatterns = router.urls
