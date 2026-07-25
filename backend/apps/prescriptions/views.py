from rest_framework import viewsets

from .models import Drug, Prescription
from .serializers import DrugSerializer, PrescriptionSerializer


class DrugViewSet(viewsets.ModelViewSet):
    queryset = Drug.objects.all()
    serializer_class = DrugSerializer
    search_fields = ['name']
    pagination_class = None  # the catalog is small; return it whole for autocomplete


class PrescriptionViewSet(viewsets.ModelViewSet):
    queryset = Prescription.objects.select_related('patient', 'dentist').prefetch_related('items')
    serializer_class = PrescriptionSerializer
    filterset_fields = ['patient', 'dentist']
    search_fields = ['patient__full_name', 'items__drug_name']

    def perform_create(self, serializer):
        if not serializer.validated_data.get('dentist') and self.request.user.is_dentist:
            serializer.save(dentist=self.request.user)
        else:
            serializer.save()
