from django.db.models import Max
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Appointment
from .serializers import AppointmentSerializer


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.select_related('patient', 'dentist')
    serializer_class = AppointmentSerializer
    filterset_fields = ['status', 'dentist', 'patient', 'branch', 'visit_type']
    search_fields = ['patient__full_name', 'patient__file_number', 'reason']
    ordering_fields = ['scheduled_at', 'created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        date = self.request.query_params.get('date')
        if date and (parsed := parse_date(date)):
            qs = qs.filter(scheduled_at__date=parsed)
        return qs

    @action(detail=True, methods=['post'], url_path='collect-fee')
    def collect_fee(self, request, pk=None):
        """Mark the visit fee as collected (counts toward revenue)."""
        appt = self.get_object()
        if appt.fee_paid_at:
            return Response({'detail': 'الرسوم محصّلة بالفعل'}, status=status.HTTP_400_BAD_REQUEST)
        amount = request.data.get('amount')
        if amount is not None:
            appt.fee = amount
        if not appt.fee or float(appt.fee) <= 0:
            return Response({'detail': 'حدد قيمة الرسوم أولاً'}, status=status.HTTP_400_BAD_REQUEST)
        appt.fee_paid_at = timezone.now()
        appt.save(update_fields=['fee', 'fee_paid_at', 'updated_at'])
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        """Register attendance: patient joins the waiting room at the end of the queue."""
        appt = self.get_object()
        appt.status = Appointment.Status.CONFIRMED
        appt.checked_in_at = timezone.now()
        appt.queue_status = Appointment.QueueStatus.WAITING
        day = appt.checked_in_at.date()
        last = (
            Appointment.objects
            .filter(scheduled_at__date=day)
            .exclude(pk=appt.pk)
            .aggregate(m=Max('queue_order'))['m'] or 0
        )
        appt.queue_order = last + 1
        appt.save(update_fields=[
            'status', 'checked_in_at', 'queue_status', 'queue_order', 'updated_at',
        ])
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=['post'], url_path='queue-state')
    def queue_state(self, request, pk=None):
        """Move a patient between waiting / in_room / done (called from the waiting room)."""
        appt = self.get_object()
        state = request.data.get('state')
        valid = {c for c, _ in Appointment.QueueStatus.choices}
        if state not in valid:
            return Response({'detail': 'حالة غير صحيحة'}, status=status.HTTP_400_BAD_REQUEST)
        appt.queue_status = state
        if state == Appointment.QueueStatus.DONE:
            appt.status = Appointment.Status.COMPLETED
        appt.save(update_fields=['queue_status', 'status', 'updated_at'])
        return Response(AppointmentSerializer(appt).data)

    @action(detail=True, methods=['post'], url_path='queue-move')
    def queue_move(self, request, pk=None):
        """Reorder the waiting queue by swapping order with the neighbour (dir=up|down)."""
        appt = self.get_object()
        direction = request.data.get('dir')
        day = (appt.checked_in_at or appt.scheduled_at).date()
        siblings = Appointment.objects.filter(
            scheduled_at__date=day,
            queue_status=Appointment.QueueStatus.WAITING,
        ).order_by('queue_order', 'scheduled_at')
        ordered = list(siblings)
        idx = next((i for i, a in enumerate(ordered) if a.pk == appt.pk), None)
        if idx is None:
            return Response({'detail': 'المريض ليس في قائمة الانتظار'}, status=status.HTTP_400_BAD_REQUEST)
        swap = idx - 1 if direction == 'up' else idx + 1 if direction == 'down' else None
        if swap is None or swap < 0 or swap >= len(ordered):
            return Response(AppointmentSerializer(appt).data)
        other = ordered[swap]
        appt.queue_order, other.queue_order = other.queue_order, appt.queue_order
        appt.save(update_fields=['queue_order', 'updated_at'])
        other.save(update_fields=['queue_order', 'updated_at'])
        return Response(AppointmentSerializer(appt).data)
