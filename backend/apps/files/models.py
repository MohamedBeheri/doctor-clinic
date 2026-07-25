from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def patient_file_path(instance, filename):
    return f'patients/{instance.patient_id}/{filename}'


class PatientFile(models.Model):
    class Category(models.TextChoices):
        XRAY = 'xray', _('أشعة')
        PHOTO = 'photo', _('صورة')
        LAB = 'lab', _('تحاليل')
        DOCUMENT = 'document', _('مستند')
        OTHER = 'other', _('أخرى')

    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE,
        related_name='files', verbose_name=_('المريض'),
    )
    file = models.FileField(upload_to=patient_file_path, verbose_name=_('الملف'))
    title = models.CharField(max_length=200, verbose_name=_('العنوان'))
    category = models.CharField(
        max_length=20, choices=Category.choices,
        default=Category.OTHER, verbose_name=_('التصنيف'),
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='uploaded_files', verbose_name=_('رفعه'),
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاريخ الرفع'))

    class Meta:
        verbose_name = _('مرفق')
        verbose_name_plural = _('المرفقات')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f'{self.patient.full_name} - {self.title}'
