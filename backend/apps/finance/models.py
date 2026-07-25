from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Expense(models.Model):
    """Money going out of the clinic — supplier purchases, rent, salaries, etc."""

    class Category(models.TextChoices):
        SUPPLIER = 'supplier', _('مشتريات مورد')
        RENT = 'rent', _('إيجار')
        SALARIES = 'salaries', _('مرتبات')
        UTILITIES = 'utilities', _('مرافق (كهرباء/مياه/نت)')
        MAINTENANCE = 'maintenance', _('صيانة')
        OTHER = 'other', _('أخرى')

    date = models.DateField(verbose_name=_('التاريخ'))
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name=_('المبلغ'))
    category = models.CharField(
        max_length=20, choices=Category.choices,
        default=Category.OTHER, verbose_name=_('الفئة'),
    )
    supplier = models.ForeignKey(
        'inventory.Supplier', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments', verbose_name=_('المورد'),
    )
    note = models.CharField(max_length=255, blank=True, verbose_name=_('البيان'))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='expenses', verbose_name=_('بواسطة'),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('مصروف')
        verbose_name_plural = _('المصروفات')
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.get_category_display()} - {self.amount} ({self.date})'
