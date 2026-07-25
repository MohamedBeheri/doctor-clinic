from rest_framework import serializers

from .models import Product, StockMovement, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'address', 'notes', 'created_at']
        read_only_fields = ['created_at']


class ProductSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    is_low = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'unit', 'quantity', 'min_quantity',
            'price', 'supplier', 'supplier_name', 'is_low', 'created_at',
        ]
        read_only_fields = ['quantity', 'created_at']


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'movement_type', 'movement_type_display',
            'quantity', 'note', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']

    def validate(self, attrs):
        if attrs['movement_type'] == StockMovement.MovementType.OUT:
            if attrs['quantity'] > attrs['product'].quantity:
                raise serializers.ValidationError(
                    {'quantity': 'الكمية المنصرفة أكبر من المتاح في المخزن'}
                )
        return attrs
