from rest_framework import viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from .models import PatientFile
from .serializers import PatientFileSerializer


class PatientFileViewSet(viewsets.ModelViewSet):
    queryset = PatientFile.objects.select_related('patient', 'uploaded_by')
    serializer_class = PatientFileSerializer
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['patient', 'category']

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
