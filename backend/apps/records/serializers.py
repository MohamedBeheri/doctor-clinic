from rest_framework import serializers

from .models import (
    PlanTemplate, PlanTemplateItem, TreatmentPlan, TreatmentPlanItem, TreatmentRecord,
)


class TreatmentRecordSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    dentist_name = serializers.CharField(source='dentist.full_name', read_only=True)

    class Meta:
        model = TreatmentRecord
        fields = [
            'id', 'patient', 'patient_name', 'appointment', 'dentist', 'dentist_name',
            'complaint', 'diagnosis', 'treatment', 'prescription', 'cost', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class TreatmentPlanItemSerializer(serializers.ModelSerializer):
    is_billed = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlanItem
        fields = ['id', 'description', 'cost', 'is_done', 'order', 'is_billed']

    def get_is_billed(self, obj):
        return obj.invoice_item_id is not None


class TreatmentPlanSerializer(serializers.ModelSerializer):
    items = TreatmentPlanItemSerializer(many=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    dentist_name = serializers.CharField(source='dentist.full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_cost = serializers.SerializerMethodField()
    done_count = serializers.SerializerMethodField()
    invoice_number = serializers.CharField(source='invoice.number', read_only=True, default=None)
    billed_total = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()

    class Meta:
        model = TreatmentPlan
        fields = [
            'id', 'patient', 'patient_name', 'dentist', 'dentist_name',
            'title', 'status', 'status_display', 'notes',
            'items', 'total_cost', 'done_count',
            'invoice', 'invoice_number', 'billed_total', 'paid_amount', 'balance',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'invoice']

    def get_total_cost(self, obj):
        return sum(i.cost for i in obj.items.all())

    def get_done_count(self, obj):
        return sum(1 for i in obj.items.all() if i.is_done)

    def get_billed_total(self, obj):
        return obj.invoice.subtotal if obj.invoice_id else 0

    def get_paid_amount(self, obj):
        return obj.invoice.paid_amount if obj.invoice_id else 0

    def get_balance(self, obj):
        return obj.invoice.balance if obj.invoice_id else 0

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        plan = TreatmentPlan.objects.create(**validated_data)
        for i, item in enumerate(items):
            TreatmentPlanItem.objects.create(
                plan=plan, order=item.get('order', i),
                **{k: v for k, v in item.items() if k != 'order'},
            )
        return plan

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items is not None:
            # Never drop already-billed (invoiced) items; replace only the unbilled ones.
            instance.items.filter(invoice_item__isnull=True).delete()
            base = instance.items.count()
            for i, item in enumerate(items):
                TreatmentPlanItem.objects.create(
                    plan=instance, order=item.get('order', base + i),
                    **{k: v for k, v in item.items() if k != 'order'},
                )
        return instance


class PlanTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanTemplateItem
        fields = ['id', 'description', 'cost', 'order']


class PlanTemplateSerializer(serializers.ModelSerializer):
    items = PlanTemplateItemSerializer(many=True)
    items_count = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()

    class Meta:
        model = PlanTemplate
        fields = ['id', 'name', 'description', 'is_active', 'items', 'items_count', 'total_cost', 'created_at']
        read_only_fields = ['created_at']

    def get_items_count(self, obj):
        return obj.items.count()

    def get_total_cost(self, obj):
        return sum(i.cost for i in obj.items.all())

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        template = PlanTemplate.objects.create(**validated_data)
        for i, item in enumerate(items):
            PlanTemplateItem.objects.create(
                template=template, order=item.get('order', i),
                **{k: v for k, v in item.items() if k != 'order'},
            )
        return template

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for i, item in enumerate(items):
                PlanTemplateItem.objects.create(
                    template=instance, order=item.get('order', i),
                    **{k: v for k, v in item.items() if k != 'order'},
                )
        return instance
