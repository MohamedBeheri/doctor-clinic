from django.db import models
from django.utils.translation import gettext_lazy as _


class ChatSession(models.Model):
    """Tracks a WhatsApp conversation state per phone number."""

    class Step(models.TextChoices):
        IDLE = 'idle', _('في الانتظار')
        ASK_NAME = 'ask_name', _('السؤال عن الاسم')
        ASK_DATE = 'ask_date', _('السؤال عن التاريخ')
        ASK_TIME = 'ask_time', _('السؤال عن الوقت')
        CONFIRM = 'confirm', _('تأكيد الحجز')

    wa_id = models.CharField(max_length=30, unique=True, db_index=True, verbose_name=_('رقم واتساب'))
    step = models.CharField(max_length=15, choices=Step.choices, default=Step.IDLE)
    patient_name = models.CharField(max_length=150, blank=True)
    chosen_date = models.DateField(null=True, blank=True)
    chosen_time = models.TimeField(null=True, blank=True)
    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.SET_NULL, null=True, blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.wa_id} — {self.step}'

    def reset(self):
        self.step = self.Step.IDLE
        self.patient_name = ''
        self.chosen_date = None
        self.chosen_time = None
        self.save()
