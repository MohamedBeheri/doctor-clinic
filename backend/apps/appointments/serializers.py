from rest_framework import serializers

from .models import Appointment


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    patient_file = serializers.CharField(source='patient.file_number', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    dentist_name = serializers.CharField(source='dentist.full_name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    queue_status_display = serializers.CharField(source='get_queue_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'patient_name', 'patient_file', 'patient_phone',
            'dentist', 'dentist_name', 'branch', 'branch_name',
            'scheduled_at', 'duration_minutes',
            'status', 'status_display',
            'visit_type', 'visit_type_display', 'fee', 'fee_paid_at',
            'checked_in_at', 'queue_status', 'queue_status_display', 'queue_order',
            'source', 'source_display',
            'reason', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        """Prevent double-booking the same dentist in an overlapping slot."""
        dentist = attrs.get('dentist') or getattr(self.instance, 'dentist', None)
        scheduled_at = attrs.get('scheduled_at') or getattr(self.instance, 'scheduled_at', None)
        if dentist and scheduled_at:
            clash = Appointment.objects.filter(
                dentist=dentist,
                scheduled_at=scheduled_at,
            ).exclude(status__in=[Appointment.Status.CANCELLED, Appointment.Status.NO_SHOW])
            if self.instance:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError(
                    {'scheduled_at': 'يوجد موعد آخر لنفس الطبيب في هذا التوقيت'}
                )
        return attrs
