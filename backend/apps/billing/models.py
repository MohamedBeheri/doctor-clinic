from decimal import Decimal

from django.db import models
from django.db.models import Sum
from django.utils.translation import gettext_lazy as _


class Invoice(models.Model):
    class Status(models.TextChoices):
        UNPAID = 'unpaid', _('غير مدفوعة')
        PARTIAL = 'partial', _('مدفوعة جزئياً')
        PAID = 'paid', _('مدفوعة')
        CANCELLED = 'cancelled', _('ملغاة')

    number = models.CharField(max_length=20, unique=True, verbose_name=_('رقم الفاتورة'))
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='invoices',
        verbose_name=_('المريض'),
    )
    discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('الخصم'),
    )
    status = models.CharField(
        max_length=20, choices=Status.choices,
        default=Status.UNPAID, verbose_name=_('الحالة'),
    )
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('فاتورة')
        verbose_name_plural = _('الفواتير')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.number} - {self.patient.full_name}'

    @property
    def subtotal(self):
        return self.items.aggregate(t=Sum('total'))['t'] or Decimal('0')

    @property
    def total(self):
        return self.subtotal - self.discount

    @property
    def paid_amount(self):
        return self.payments.aggregate(t=Sum('amount'))['t'] or Decimal('0')

    @property
    def balance(self):
        return self.total - self.paid_amount

    def refresh_status(self):
        if self.status == self.Status.CANCELLED:
            return
        paid = self.paid_amount
        if paid <= 0:
            self.status = self.Status.UNPAID
        elif paid >= self.total:
            self.status = self.Status.PAID
        else:
            self.status = self.Status.PARTIAL
        self.save(update_fields=['status', 'updated_at'])

    def save(self, *args, **kwargs):
        if not self.number:
            last = Invoice.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.number = f'INV{next_id:05d}'
        super().save(*args, **kwargs)


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='items', verbose_name=_('الفاتورة'),
    )
    description = models.CharField(max_length=255, verbose_name=_('الوصف'))
    quantity = models.PositiveIntegerField(default=1, verbose_name=_('الكمية'))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('سعر الوحدة'))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name=_('الإجمالي'))

    class Meta:
        verbose_name = _('بند فاتورة')
        verbose_name_plural = _('بنود الفاتورة')

    def save(self, *args, **kwargs):
        self.total = Decimal(self.quantity) * self.unit_price
        super().save(*args, **kwargs)


class Payment(models.Model):
    class Method(models.TextChoices):
        CASH = 'cash', _('نقدي')
        CARD = 'card', _('بطاقة')
        TRANSFER = 'transfer', _('تحويل')

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE, related_name='payments', verbose_name=_('الفاتورة'),
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('المبلغ'))
    method = models.CharField(
        max_length=20, choices=Method.choices,
        default=Method.CASH, verbose_name=_('طريقة الدفع'),
    )
    paid_at = models.DateTimeField(auto_now_add=True, verbose_name=_('تاريخ الدفع'))
    notes = models.CharField(max_length=255, blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        verbose_name = _('دفعة')
        verbose_name_plural = _('الدفعات')
        ordering = ['-paid_at']

    def __str__(self):
        return f'{self.invoice.number} - {self.amount}'


class Installment(models.Model):
    """A scheduled partial payment for an invoice."""

    invoice = models.ForeignKey(
        Invoice, on_delete=models.CASCADE,
        related_name='installments', verbose_name=_('الفاتورة'),
    )
    due_date = models.DateField(verbose_name=_('تاريخ الاستحقاق'))
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('المبلغ'))
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name=_('تاريخ السداد'))
    payment = models.OneToOneField(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='installment', verbose_name=_('الدفعة'),
    )
    notes = models.CharField(max_length=255, blank=True, verbose_name=_('ملاحظات'))

    class Meta:
        verbose_name = _('قسط')
        verbose_name_plural = _('الأقساط')
        ordering = ['due_date']

    def __str__(self):
        return f'{self.invoice.number} - {self.amount} ({self.due_date})'

    @property
    def is_paid(self):
        return self.paid_at is not None

    @property
    def is_overdue(self):
        from django.utils import timezone
        return not self.is_paid and self.due_date < timezone.localdate()
