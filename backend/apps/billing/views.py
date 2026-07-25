from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.permissions import RoleWritePermission

from .models import Installment, Invoice, Payment
from .serializers import InstallmentSerializer, InvoiceSerializer, PaymentSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.select_related('patient').prefetch_related(
        'items', 'payments', 'installments'
    )
    serializer_class = InvoiceSerializer
    permission_classes = [RoleWritePermission]
    write_roles = ('receptionist', 'dentist', 'assistant')
    delete_roles = ()  # admin only
    filterset_fields = ['status', 'patient']
    search_fields = ['number', 'patient__full_name', 'patient__file_number']
    ordering_fields = ['created_at']

    @action(detail=True, methods=['post'], url_path='create-installments')
    def create_installments(self, request, pk=None):
        """Split the invoice remaining balance into N monthly installments."""
        invoice = self.get_object()
        try:
            months = int(request.data.get('months', 0))
        except (TypeError, ValueError):
            months = 0
        if months < 2 or months > 36:
            return Response(
                {'months': 'عدد الأقساط يجب أن يكون بين 2 و36'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if invoice.installments.exists():
            return Response(
                {'detail': 'توجد أقساط بالفعل لهذه الفاتورة'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        balance = invoice.balance
        if balance <= 0:
            return Response(
                {'detail': 'لا يوجد رصيد متبقٍ لتقسيطه'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        per = round(balance / months, 2)
        start = timezone.localdate()
        for i in range(months):
            amount = per if i < months - 1 else balance - per * (months - 1)
            Installment.objects.create(
                invoice=invoice,
                due_date=start + relativedelta(months=i + 1),
                amount=amount,
            )
        return Response(InvoiceSerializer(invoice).data)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('invoice')
    serializer_class = PaymentSerializer
    filterset_fields = ['invoice', 'method']

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()
        invoice.refresh_status()


class InstallmentViewSet(viewsets.ModelViewSet):
    queryset = Installment.objects.select_related('invoice', 'invoice__patient')
    serializer_class = InstallmentSerializer
    filterset_fields = ['invoice']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('unpaid') == 'true':
            qs = qs.filter(paid_at__isnull=True)
        return qs

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Mark an installment paid — records a Payment on the invoice."""
        installment = self.get_object()
        if installment.is_paid:
            return Response(
                {'detail': 'القسط مسدد بالفعل'}, status=status.HTTP_400_BAD_REQUEST
            )
        method = request.data.get('method', Payment.Method.CASH)
        payment = Payment.objects.create(
            invoice=installment.invoice,
            amount=installment.amount,
            method=method,
            notes=f'سداد قسط مستحق {installment.due_date}',
        )
        installment.payment = payment
        installment.paid_at = timezone.now()
        installment.save(update_fields=['payment', 'paid_at'])
        installment.invoice.refresh_status()
        return Response(InstallmentSerializer(installment).data)
