from rest_framework import serializers

from .models import Branch, ClinicSettings, VisitType


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'address', 'phone', 'is_active', 'created_at']
        read_only_fields = ['created_at']


class VisitTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitType
        fields = ['id', 'code', 'name', 'name_en', 'price', 'order', 'is_active']


class ClinicSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = ClinicSettings
        fields = [
            'clinic_name', 'whatsapp_country_code', 'whatsapp_number',
            'appointment_template', 'invoice_template', 'logo', 'logo_url',
            'default_exam_fee', 'default_reexam_fee', 'default_consultation_fee',
            'consultation_valid_days',
            'wa_api_token', 'wa_phone_number_id', 'wa_verify_token', 'wa_bot_enabled',
            'updated_at',
        ]
        read_only_fields = ['updated_at']
        extra_kwargs = {'logo': {'write_only': True, 'required': False}}

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get('request')
        url = obj.logo.url
        return request.build_absolute_uri(url) if request else url
