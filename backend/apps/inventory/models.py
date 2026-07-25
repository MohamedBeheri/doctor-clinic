from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class Supplier(models.Model):
    name = models.CharField(max_length=150, verbose_name=_('اسم المورد'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('الهاتف'))
    address = models.CharField(max_length=255, blank=True, verbose_name=_('العنوان'))
    notes = models.TextField(blank=True, verbose_name=_('ملاحظات'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('مورد')
        verbose_name_plural = _('الموردون')
        ordering = ['name']

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=200, verbose_name=_('اسم الصنف'))
    unit = models.CharField(max_length=50, default='قطعة', verbose_name=_('الوحدة'))
    quantity = models.IntegerField(default=0, verbose_name=_('الكمية الحالية'))
    min_quantity = models.IntegerField(default=5, verbose_name=_('حد إعادة الطلب'))
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('سعر الشراء'),
    )
    supplier = models.ForeignKey(
        Supplier, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='products', verbose_name=_('المورد'),
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('صنف')
        verbose_name_plural = _('الأصناف')
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def is_low(self):
        return self.quantity <= self.min_quantity


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        IN = 'in', _('وارد')
        OUT = 'out', _('منصرف')

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE,
        related_name='movements', verbose_name=_('الصنف'),
    )
    movement_type = models.CharField(
        max_length=5, choices=MovementType.choices, verbose_name=_('النوع'),
    )
    quantity = models.PositiveIntegerField(verbose_name=_('الكمية'))
    note = models.CharField(max_length=255, blank=True, verbose_name=_('البيان'))
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='stock_movements', verbose_name=_('بواسطة'),
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_('التاريخ'))

    class Meta:
        verbose_name = _('حركة مخزون')
        verbose_name_plural = _('حركات المخزون')
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            delta = self.quantity if self.movement_type == self.MovementType.IN else -self.quantity
            Product.objects.filter(pk=self.product_id).update(
                quantity=models.F('quantity') + delta
            )
