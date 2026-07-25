from django.utils import timezone
from rest_framework import serializers

from .models import Installment, Invoice, InvoiceItem, Payment


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'total']
        read_only_fields = ['total']


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'amount', 'method', 'method_display', 'paid_at', 'notes']
        read_only_fields = ['paid_at']

    def create(self, validated_data):
        payment = super().create(validated_data)
        payment.invoice.refresh_status()
        return payment


class InstallmentSerializer(serializers.ModelSerializer):
    is_paid = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    invoice_number = serializers.CharField(source='invoice.number', read_only=True)
    patient_name = serializers.CharField(source='invoice.patient.full_name', read_only=True)

    class Meta:
        model = Installment
        fields = [
            'id', 'invoice', 'invoice_number', 'patient_name',
            'due_date', 'amount', 'paid_at', 'is_paid', 'is_overdue', 'notes',
        ]
        read_only_fields = ['paid_at']


class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    payments = PaymentSerializer(many=True, read_only=True)
    installments = InstallmentSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_file = serializers.CharField(source='patient.file_number', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    paid_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'number', 'patient', 'patient_name', 'patient_file', 'patient_phone',
            'discount', 'status', 'status_display', 'notes',
            'items', 'payments', 'installments',
            'subtotal', 'total', 'paid_amount', 'balance',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['number', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        for item in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item)
        invoice.refresh_status()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                InvoiceItem.objects.create(invoice=instance, **item)
        instance.refresh_status()
        return instance
