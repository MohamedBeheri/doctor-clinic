from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.permissions import RoleWritePermission

from .models import Branch, ClinicSettings, VisitType
from .serializers import BranchSerializer, ClinicSettingsSerializer, VisitTypeSerializer


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [RoleWritePermission]
    write_roles = ()  # admin only
    filterset_fields = ['is_active']
    search_fields = ['name']


class VisitTypeViewSet(viewsets.ModelViewSet):
    queryset = VisitType.objects.all()
    serializer_class = VisitTypeSerializer
    permission_classes = [RoleWritePermission]
    write_roles = ()  # admin only
    filterset_fields = ['is_active']
    pagination_class = None


class ClinicBrandingView(APIView):
    """Public branding info for the login screen: clinic name + logo only."""

    permission_classes = [AllowAny]

    def get(self, request):
        s = ClinicSettings.load()
        logo_url = None
        if s.logo:
            logo_url = request.build_absolute_uri(s.logo.url)
        return Response({'clinic_name': s.clinic_name, 'logo_url': logo_url})


class ClinicSettingsView(APIView):
    """Read for any authenticated user; update for admin only. Accepts JSON or multipart (logo)."""

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get(self, request):
        return Response(ClinicSettingsSerializer(ClinicSettings.load(), context={'request': request}).data)

    def put(self, request):
        user = request.user
        if not (user.is_superuser or user.role == 'admin'):
            return Response({'detail': 'صلاحية المدير مطلوبة'}, status=403)
        settings = ClinicSettings.load()
        serializer = ClinicSettingsSerializer(
            settings, data=request.data, partial=True, context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
