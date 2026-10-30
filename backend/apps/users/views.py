import hashlib
import os
import tempfile

from django.core.cache.backends.filebased import FileBasedCache
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import User
from .serializers import (
    ClinicTokenObtainPairSerializer,
    UserSerializer,
    UserWriteSerializer,
)


class LoginThrottle(SimpleRateThrottle):
    """At most 10 sign-in attempts a minute on one account, whatever address they come from: a forged
    X-Forwarded-For does not escape it, and a proxy in front that makes every visitor look alike cannot lock
    everyone out together."""
    scope = 'login'
    rate = '10/min'
    # one count for all the server's workers — each keeps its own memory cache
    cache = FileBasedCache(os.path.join(tempfile.gettempdir(), 'doctor-login-throttle'), {})

    def get_cache_key(self, request, view):
        account = str(request.data.get('username') or '').strip().lower()
        if not account:
            return None                  # nothing to guess with: the serializer turns it down
        return self.cache_format % {'scope': self.scope, 'ident': hashlib.sha256(account.encode()).hexdigest()[:32]}


class ClinicTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginThrottle]
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
