from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    ClinicTokenObtainPairSerializer,
    UserSerializer,
    UserWriteSerializer,
)


class ClinicTokenObtainPairView(TokenObtainPairView):
    serializer_class = ClinicTokenObtainPairSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'full_name', 'phone']

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve', 'me'):
            return UserSerializer
        return UserWriteSerializer

    def get_permissions(self):
        if self.action == 'me':
            return super().get_permissions()
        return [IsAdminUser()]

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)

    @action(detail=False, methods=['get'])
    def dentists(self, request):
        qs = self.queryset.filter(role=User.Role.DENTIST, is_active=True)
        return Response(UserSerializer(qs, many=True).data)
