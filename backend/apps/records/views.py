from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.billing.models import InvoiceItem
from .models import (
    PlanTemplate, TreatmentPlan, TreatmentPlanItem, TreatmentRecord,
)
from .serializers import (
    PlanTemplateSerializer, TreatmentPlanSerializer, TreatmentRecordSerializer,
)


class TreatmentRecordViewSet(viewsets.ModelViewSet):
    queryset = TreatmentRecord.objects.select_related('patient', 'dentist', 'appointment')
    serializer_class = TreatmentRecordSerializer
    filterset_fields = ['patient', 'dentist']
    search_fields = ['patient__full_name', 'diagnosis', 'treatment']
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('dentist') and self.request.user.is_dentist:
            serializer.save(dentist=self.request.user)
        else:
            serializer.save()


class TreatmentPlanViewSet(viewsets.ModelViewSet):
    queryset = TreatmentPlan.objects.select_related('patient', 'dentist').prefetch_related('items')
    serializer_class = TreatmentPlanSerializer
    filterset_fields = ['patient', 'dentist', 'status']
    search_fields = ['title', 'patient__full_name']

    @action(detail=True, methods=['post'], url_path='toggle-item/(?P<item_id>[0-9]+)')
    def toggle_item(self, request, pk=None, item_id=None):
        """Toggle an item done/undone. Marking done bills it as a partial line
        into the plan's master invoice; un-marking removes that line (only while
        the invoice has no payments yet)."""
        plan = self.get_object()
        item = TreatmentPlanItem.objects.get(pk=item_id, plan_id=pk)

        if not item.is_done:
            # Mark done → bill this portion into the plan invoice.
            item.is_done = True
            if not item.invoice_item_id:
                inv = plan.ensure_invoice()
                inv_item = InvoiceItem.objects.create(
                    invoice=inv,
                    description=item.description,
                    quantity=1,
                    unit_price=item.cost,
                )
                item.invoice_item = inv_item
            item.save(update_fields=['is_done', 'invoice_item'])
            if plan.invoice_id:
                plan.invoice.refresh_status()
        else:
            # Un-mark → remove the billed line, unless the invoice was already (partly) paid.
            inv_item = item.invoice_item
            if inv_item and inv_item.invoice.paid_amount > 0:
                return Response(
                    {'detail': 'لا يمكن التراجع: توجد مدفوعات على فاتورة الخطة'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.is_done = False
            item.invoice_item = None
            item.save(update_fields=['is_done', 'invoice_item'])
            if inv_item:
                invoice = inv_item.invoice
                inv_item.delete()
                invoice.refresh_status()

        fresh = TreatmentPlan.objects.prefetch_related('items').get(pk=plan.pk)
        return Response(TreatmentPlanSerializer(fresh).data)


class PlanTemplateViewSet(viewsets.ModelViewSet):
    queryset = PlanTemplate.objects.prefetch_related('items')
    serializer_class = PlanTemplateSerializer
    filterset_fields = ['is_active']
    search_fields = ['name']

    @action(detail=True, methods=['post'], url_path='apply')
    def apply(self, request, pk=None):
        """Instantiate this preset as a new treatment plan for a patient."""
        template = self.get_object()
        patient_id = request.data.get('patient')
        if not patient_id:
            return Response({'detail': 'حدد المريض'}, status=400)
        dentist = request.user if getattr(request.user, 'is_dentist', False) else None
        plan = TreatmentPlan.objects.create(
            patient_id=patient_id,
            dentist=dentist,
            title=request.data.get('title') or template.name,
        )
        for item in template.items.all():
            TreatmentPlanItem.objects.create(
                plan=plan, description=item.description, cost=item.cost, order=item.order,
            )
        return Response(TreatmentPlanSerializer(plan).data, status=201)
