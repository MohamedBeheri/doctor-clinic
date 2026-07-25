from rest_framework import viewsets

from .models import Product, StockMovement, Supplier
from .serializers import ProductSerializer, StockMovementSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ['name', 'phone']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('supplier')
    serializer_class = ProductSerializer
    filterset_fields = ['supplier']
    search_fields = ['name']
    ordering_fields = ['name', 'quantity']


class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('product', 'created_by')
    serializer_class = StockMovementSerializer
    filterset_fields = ['product', 'movement_type']
    http_method_names = ['get', 'post', 'head', 'options']  # movements are append-only

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
