from rest_framework import serializers

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = Patient
        fields = [
            'id', 'file_number', 'full_name', 'gender', 'gender_display',
            'date_of_birth', 'age', 'phone', 'email', 'address',
            'medical_history', 'allergies', 'chronic_diseases', 'blood_type',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['file_number', 'created_at', 'updated_at']
