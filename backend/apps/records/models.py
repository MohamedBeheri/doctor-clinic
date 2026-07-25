from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class TreatmentRecord(models.Model):
    """A single clinical/EMR entry."""

    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='treatment_records',
        verbose_name=_('المريض'),
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='treatment_records',
        verbose_name=_('الموعد'),
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='treatment_records',
        verbose_name=_('الطبيب'),
    )
    complaint = models.TextField(blank=True, verbose_name=_('الشكوى'))
    diagnosis = models.TextField(verbose_name=_('التشخيص'))
    treatment = models.TextField(blank=True, verbose_name=_('العلاج المُقدَّم'))
    prescription = models.TextField(blank=True, verbose_name=_('الوصفة الطبية'))
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('التكلفة'),
    )
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('سجل علاج')
        verbose_name_plural = _('سجلات العلاج')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.patient.full_name} - {self.created_at:%Y-%m-%d}'


class TreatmentPlan(models.Model):
    """A multi-step proposed/ongoing plan for a patient."""

    class Status(models.TextChoices):
        PROPOSED = 'proposed', _('مقترحة')
        ACCEPTED = 'accepted', _('مقبولة')
        IN_PROGRESS = 'in_progress', _('قيد التنفيذ')
        COMPLETED = 'completed', _('مكتملة')
        CANCELLED = 'cancelled', _('ملغاة')

    patient = models.ForeignKey(
        'patients.Patient', on_delete=models.CASCADE,
        related_name='treatment_plans', verbose_name=_('المريض'),
    )
    dentist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='treatment_plans', verbose_name=_('الطبيب'),
    )
    title = models.CharField(max_length=200, verbose_name=_('عنوان الخطة'))
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.PROPOSED, verbose_name=_('الحالة'),
    )
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    invoice = models.OneToOneField(
        'billing.Invoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treatment_plan', verbose_name=_('فاتورة الخطة'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('خطة علاج')
        verbose_name_plural = _('خطط العلاج')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.patient.full_name} - {self.title}'

    def ensure_invoice(self):
        """The plan's master invoice; created lazily when the first item is billed."""
        if self.invoice_id:
            return self.invoice
        from apps.billing.models import Invoice
        inv = Invoice.objects.create(
            patient=self.patient, notes=_('خطة علاج: %(t)s') % {'t': self.title},
        )
        self.invoice = inv
        self.save(update_fields=['invoice', 'updated_at'])
        return inv


class TreatmentPlanItem(models.Model):
    plan = models.ForeignKey(
        TreatmentPlan, on_delete=models.CASCADE,
        related_name='items', verbose_name=_('الخطة'),
    )
    description = models.CharField(max_length=255, verbose_name=_('الإجراء'))
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('التكلفة'),
    )
    is_done = models.BooleanField(default=False, verbose_name=_('منفذ'))
    order = models.PositiveIntegerField(default=0, verbose_name=_('الترتيب'))
    invoice_item = models.OneToOneField(
        'billing.InvoiceItem', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='plan_item', verbose_name=_('بند الفاتورة'),
    )

    class Meta:
        verbose_name = _('بند خطة')
        verbose_name_plural = _('بنود الخطة')
        ordering = ['order', 'id']


class PlanTemplate(models.Model):
    """A preset (fixed) treatment plan with known steps — recalled per patient."""

    name = models.CharField(max_length=200, verbose_name=_('اسم القالب'))
    description = models.CharField(max_length=255, blank=True, verbose_name=_('وصف'))
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('قالب خطة علاج')
        verbose_name_plural = _('قوالب خطط العلاج')
        ordering = ['name']

    def __str__(self):
        return self.name


class PlanTemplateItem(models.Model):
    template = models.ForeignKey(
        PlanTemplate, on_delete=models.CASCADE,
        related_name='items', verbose_name=_('القالب'),
    )
    description = models.CharField(max_length=255, verbose_name=_('الإجراء'))
    cost = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('التكلفة الافتراضية'),
    )
    order = models.PositiveIntegerField(default=0, verbose_name=_('الترتيب'))

    class Meta:
        verbose_name = _('بند قالب')
        verbose_name_plural = _('بنود القالب')
        ordering = ['order', 'id']
