from datetime import date

from django.db import models
from django.utils.translation import gettext_lazy as _


class Patient(models.Model):
    class Gender(models.TextChoices):
        MALE = 'male', _('ذكر')
        FEMALE = 'female', _('أنثى')

    file_number = models.CharField(
        max_length=20, unique=True, verbose_name=_('رقم الملف'),
        help_text=_('يُولّد تلقائياً إن تُرك فارغاً'),
    )
    full_name = models.CharField(max_length=150, verbose_name=_('الاسم الكامل'))
    gender = models.CharField(max_length=10, choices=Gender.choices, verbose_name=_('النوع'))
    date_of_birth = models.DateField(null=True, blank=True, verbose_name=_('تاريخ الميلاد'))
    phone = models.CharField(max_length=20, db_index=True, verbose_name=_('رقم الهاتف'))
    email = models.EmailField(blank=True, verbose_name=_('البريد الإلكتروني'))
    address = models.CharField(max_length=255, blank=True, verbose_name=_('العنوان'))

    # Medical background (EMR summary)
    medical_history = models.TextField(blank=True, verbose_name=_('التاريخ المرضي'))
    allergies = models.TextField(blank=True, verbose_name=_('الحساسية'))
    chronic_diseases = models.TextField(blank=True, verbose_name=_('الأمراض المزمنة'))
    blood_type = models.CharField(max_length=5, blank=True, verbose_name=_('فصيلة الدم'))

    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('مريض')
        verbose_name_plural = _('المرضى')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.file_number} - {self.full_name}'

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def save(self, *args, **kwargs):
        if not self.file_number:
            last = Patient.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.file_number = f'P{next_id:05d}'
        super().save(*args, **kwargs)
