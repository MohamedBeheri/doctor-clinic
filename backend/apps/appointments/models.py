from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', _('مجدول')
        CONFIRMED = 'confirmed', _('مؤكد')
        COMPLETED = 'completed', _('مكتمل')
        CANCELLED = 'cancelled', _('ملغي')
        NO_SHOW = 'no_show', _('لم يحضر')

    class VisitType(models.TextChoices):
        EXAM = 'exam', _('كشف')
        RE_EXAM = 're_exam', _('إعادة كشف')
        CONSULTATION = 'consultation', _('استشارة')
        PROCEDURE = 'procedure', _('إجراء')

    class Source(models.TextChoices):
        WALK_IN = 'walk_in', _('حضوري')
        PHONE = 'phone', _('هاتف')
        WHATSAPP = 'whatsapp', _('واتساب')
        ONLINE = 'online', _('أونلاين')

    class QueueStatus(models.TextChoices):
        NONE = '', _('—')
        WAITING = 'waiting', _('في الانتظار')
        IN_ROOM = 'in_room', _('داخل غرفة الكشف')
        DONE = 'done', _('انتهى')

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='appointments',
        verbose_name=_('المريض'),
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='appointments',
        limit_choices_to={'role': 'dentist'},
        verbose_name=_('الطبيب'),
    )
    branch = models.ForeignKey(
        'clinic.Branch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='appointments', verbose_name=_('الفرع'),
    )
    scheduled_at = models.DateTimeField(verbose_name=_('موعد الحجز'))
    duration_minutes = models.PositiveIntegerField(default=30, verbose_name=_('المدة (دقيقة)'))
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.SCHEDULED, verbose_name=_('الحالة'),
    )
    visit_type = models.CharField(
        max_length=20, choices=VisitType.choices,
        default=VisitType.EXAM, verbose_name=_('نوع الزيارة'),
    )
    fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('رسوم الزيارة'),
        help_text=_('كشف/إعادة كشف/استشارة — صفر يعني مجاني'),
    )
    fee_paid_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_('تاريخ تحصيل الرسوم'),
    )
    checked_in_at = models.DateTimeField(
        null=True, blank=True, verbose_name=_('وقت تسجيل الحضور'),
    )
    queue_status = models.CharField(
        max_length=10, choices=QueueStatus.choices, blank=True, default='',
        verbose_name=_('حالة الطابور'),
    )
    queue_order = models.PositiveIntegerField(
        default=0, verbose_name=_('ترتيب الطابور'),
    )
    source = models.CharField(
        max_length=10, choices=Source.choices,
        default=Source.WALK_IN, verbose_name=_('مصدر الحجز'),
    )
    reason = models.CharField(max_length=255, blank=True, verbose_name=_('سبب الزيارة'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('موعد')
        verbose_name_plural = _('المواعيد')
        ordering = ['-scheduled_at']

    def __str__(self):
        return f'{self.patient.full_name} - {self.scheduled_at:%Y-%m-%d %H:%M}'
