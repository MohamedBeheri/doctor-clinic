from django.db import models
from django.utils.translation import gettext_lazy as _


class Branch(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name=_('اسم الفرع'))
    address = models.CharField(max_length=255, blank=True, verbose_name=_('العنوان'))
    phone = models.CharField(max_length=20, blank=True, verbose_name=_('الهاتف'))
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('فرع')
        verbose_name_plural = _('الفروع')
        ordering = ['name']

    def __str__(self):
        return self.name


class VisitType(models.Model):
    """Configurable visit types and their default fees (managed from Settings)."""

    code = models.SlugField(max_length=30, unique=True, verbose_name=_('الكود'))
    name = models.CharField(max_length=80, verbose_name=_('الاسم'))
    name_en = models.CharField(max_length=80, blank=True, verbose_name=_('الاسم بالإنجليزية'))
    price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('السعر الافتراضي'),
        help_text=_('صفر يعني بلا رسوم'),
    )
    order = models.PositiveIntegerField(default=0, verbose_name=_('الترتيب'))
    is_active = models.BooleanField(default=True, verbose_name=_('نشط'))

    class Meta:
        verbose_name = _('نوع زيارة')
        verbose_name_plural = _('أنواع الزيارات')
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class ClinicSettings(models.Model):
    """Global, single-row clinic configuration (WhatsApp + message templates)."""

    DEFAULT_APPOINTMENT = (
        'مرحباً {patient} 🩺\n'
        'نذكّركم بموعدكم في {clinic} يوم {date} الساعة {time}.\n'
        'لأي استفسار تواصلوا معنا على {phone}. نتمنى لكم دوام الصحة.'
    )
    DEFAULT_INVOICE = (
        'مرحباً {patient} 🩺\n'
        'فاتورتكم رقم {invoice} في {clinic}:\n'
        'الإجمالي: {total} — المدفوع: {paid} — المتبقي: {balance}.\n'
        'شكراً لثقتكم.'
    )

    clinic_name = models.CharField(
        max_length=150, default='عيادة الطبيب', verbose_name=_('اسم العيادة'),
    )
    logo = models.ImageField(
        upload_to='clinic/', blank=True, null=True, verbose_name=_('شعار العيادة'),
    )
    whatsapp_country_code = models.CharField(
        max_length=5, default='20', verbose_name=_('كود الدولة'),
        help_text=_('بدون + ، مثل 20 لمصر، 966 للسعودية'),
    )
    whatsapp_number = models.CharField(
        max_length=20, blank=True, verbose_name=_('رقم واتساب العيادة'),
        help_text=_('الرقم الذي يظهر للمريض للتواصل — يُرسَل من حساب الواتساب المفتوح على الجهاز'),
    )
    appointment_template = models.TextField(
        default=DEFAULT_APPOINTMENT, verbose_name=_('قالب رسالة الموعد'),
    )
    invoice_template = models.TextField(
        default=DEFAULT_INVOICE, verbose_name=_('قالب رسالة الفاتورة'),
    )
    default_exam_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=200, verbose_name=_('رسوم الكشف الافتراضية'),
    )
    default_reexam_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=100, verbose_name=_('رسوم إعادة الكشف الافتراضية'),
    )
    default_consultation_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name=_('رسوم الاستشارة الافتراضية'),
        help_text=_('صفر يعني الاستشارة مجانية'),
    )
    consultation_valid_days = models.PositiveIntegerField(
        default=14, verbose_name=_('مدة صلاحية الاستشارة (يوم)'),
        help_text=_('المدة بعد الكشف التي تُعتبر فيها الزيارة استشارة متابعة'),
    )

    # WhatsApp Business API (Cloud API)
    wa_api_token = models.CharField(
        max_length=300, blank=True, verbose_name=_('WhatsApp API Access Token'),
    )
    wa_phone_number_id = models.CharField(
        max_length=30, blank=True, verbose_name=_('Phone Number ID'),
        help_text=_('من Meta Developer Console'),
    )
    wa_verify_token = models.CharField(
        max_length=100, blank=True, verbose_name=_('Webhook Verify Token'),
        help_text=_('كلمة سر تختارها لتأكيد الـ webhook'),
    )
    wa_bot_enabled = models.BooleanField(
        default=False, verbose_name=_('تفعيل بوت الحجز'),
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('إعدادات العيادة')
        verbose_name_plural = _('إعدادات العيادة')

    def __str__(self):
        return self.clinic_name

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
