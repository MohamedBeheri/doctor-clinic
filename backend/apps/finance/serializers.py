from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', 'date', 'amount', 'category', 'category_display',
            'supplier', 'supplier_name',
            'note', 'created_by', 'created_by_name', 'created_at',
        ]
        read_only_fields = ['created_by', 'created_at']
