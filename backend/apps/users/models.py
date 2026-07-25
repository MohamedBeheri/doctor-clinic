from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """System user. Roles drive access across the clinic modules."""

    class Role(models.TextChoices):
        ADMIN = 'admin', _('مدير النظام')
        DENTIST = 'dentist', _('طبيب')
        ASSISTANT = 'assistant', _('مساعد')
        RECEPTIONIST = 'receptionist', _('موظف استقبال')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.RECEPTIONIST,
        verbose_name=_('الدور'),
    )
    full_name = models.CharField(max_length=150, blank=True, verbose_name=_('الاسم الكامل'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('رقم الهاتف'))
    specialty = models.CharField(
        max_length=100, blank=True, verbose_name=_('التخصص'),
        help_text=_('يُستخدم للأطباء، مثل: تقويم، جراحة، علاج جذور'),
    )
    branch = models.ForeignKey(
        'clinic.Branch', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='staff', verbose_name=_('الفرع'),
    )

    class Meta:
        verbose_name = _('مستخدم')
        verbose_name_plural = _('المستخدمون')

    def __str__(self):
        return self.full_name or self.username

    @property
    def is_dentist(self):
        return self.role == self.Role.DENTIST
