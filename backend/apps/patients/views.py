from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.appointments.models import Appointment
from apps.appointments.serializers import AppointmentSerializer
from apps.records.models import TreatmentRecord
from apps.records.serializers import TreatmentRecordSerializer

from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filterset_fields = ['gender']
    search_fields = ['file_number', 'full_name', 'phone', 'email']
    ordering_fields = ['created_at', 'full_name']

    @action(detail=True, methods=['get'])
    def appointments(self, request, pk=None):
        qs = Appointment.objects.filter(patient_id=pk).order_by('-scheduled_at')
        return Response(AppointmentSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'])
    def records(self, request, pk=None):
        qs = TreatmentRecord.objects.filter(patient_id=pk).order_by('-created_at')
        return Response(TreatmentRecordSerializer(qs, many=True).data)
