from rest_framework import serializers

from .models import Drug, Prescription, PrescriptionItem


class DrugSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drug
        fields = ['id', 'name', 'default_dosage', 'default_frequency', 'default_duration', 'notes']


class PrescriptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrescriptionItem
        fields = ['id', 'drug_name', 'dosage', 'frequency', 'duration']


class PrescriptionSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_age = serializers.IntegerField(source='patient.age', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    dentist_name = serializers.CharField(source='dentist.full_name', read_only=True)

    class Meta:
        model = Prescription
        fields = [
            'id', 'patient', 'patient_name', 'patient_age', 'patient_phone',
            'dentist', 'dentist_name', 'notes', 'items', 'created_at',
        ]
        read_only_fields = ['created_at']

    def create(self, validated_data):
        items = validated_data.pop('items', [])
        prescription = Prescription.objects.create(**validated_data)
        for item in items:
            PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription

    def update(self, instance, validated_data):
        items = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items is not None:
            instance.items.all().delete()
            for item in items:
                PrescriptionItem.objects.create(prescription=instance, **item)
        return instance
