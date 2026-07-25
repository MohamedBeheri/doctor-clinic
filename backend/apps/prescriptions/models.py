from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Prescription(models.Model):
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE,
        related_name='prescriptions', verbose_name=_('المريض'),
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='prescriptions', verbose_name=_('الطبيب'),
    )
    notes = models.TextField(blank=True, verbose_name=_('تعليمات عامة'))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('التاريخ'))

    class Meta:
        verbose_name = _('وصفة طبية')
        verbose_name_plural = _('الوصفات الطبية')
        ordering = ['-created_at']

    def __str__(self):
        return f'وصفة {self.patient.full_name} - {self.created_at:%Y-%m-%d}'


class PrescriptionItem(models.Model):
    prescription = models.ForeignKey(
        Prescription, on_delete=models.CASCADE,
        related_name='items', verbose_name=_('الوصفة'),
    )
    drug_name = models.CharField(max_length=200, verbose_name=_('الدواء'))
    dosage = models.CharField(max_length=100, blank=True, verbose_name=_('الجرعة'))
    frequency = models.CharField(max_length=100, blank=True, verbose_name=_('عدد المرات'))
    duration = models.CharField(max_length=100, blank=True, verbose_name=_('المدة'))

    class Meta:
        verbose_name = _('دواء')
        verbose_name_plural = _('الأدوية')

    def __str__(self):
        return self.drug_name


class Drug(models.Model):
    """Reusable drug catalog — autofills prescription items."""

    name = models.CharField(max_length=200, unique=True, verbose_name=_('اسم الدواء'))
    default_dosage = models.CharField(max_length=100, blank=True, verbose_name=_('الجرعة الافتراضية'))
    default_frequency = models.CharField(max_length=100, blank=True, verbose_name=_('عدد المرات الافتراضي'))
    default_duration = models.CharField(max_length=100, blank=True, verbose_name=_('المدة الافتراضية'))
    notes = models.CharField(max_length=255, blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        verbose_name = _('دواء بالقائمة')
        verbose_name_plural = _('قائمة الأدوية')
        ordering = ['name']

    def __str__(self):
        return self.name
