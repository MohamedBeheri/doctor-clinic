from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.patients.models import Patient
from apps.records.models import TreatmentRecord
from apps.users.models import User


class Command(BaseCommand):
    help = 'إنشاء بيانات تجريبية لنظام العيادة (مستخدمين، مرضى، مواعيد، سجلات، فواتير)'

    def handle(self, *args, **options):
        # Admin
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={'role': User.Role.ADMIN, 'full_name': 'مدير النظام',
                      'is_staff': True, 'is_superuser': True},
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('تم إنشاء المدير: admin / admin123'))

        # Doctors
        doctors = []
        for uname, name, spec in [
            ('dr.ahmed', 'د. أحمد سمير', 'باطنة'),
            ('dr.mona', 'د. منى خالد', 'أطفال'),
        ]:
            d, c = User.objects.get_or_create(
                username=uname,
                defaults={'role': User.Role.DENTIST, 'full_name': name, 'specialty': spec},
            )
            if c:
                d.set_password('pass1234')
                d.save()
            doctors.append(d)

        # Receptionist
        User.objects.get_or_create(
            username='reception',
            defaults={'role': User.Role.RECEPTIONIST, 'full_name': 'موظف الاستقبال'},
        )

        # Patients
        patients_data = [
            ('محمد علي', 'male', '01001234567'),
            ('سارة إبراهيم', 'female', '01112345678'),
            ('خالد حسن', 'male', '01223456789'),
            ('نور محمود', 'female', '01098765432'),
        ]
        patients = []
        for name, gender, phone in patients_data:
            p, _ = Patient.objects.get_or_create(
                full_name=name,
                defaults={'gender': gender, 'phone': phone},
            )
            patients.append(p)

        now = timezone.now()

        # Appointments (some today)
        Appointment.objects.get_or_create(
            patient=patients[0], scheduled_at=now.replace(hour=10, minute=0, second=0, microsecond=0),
            defaults={'dentist': doctors[0], 'reason': 'ارتفاع حرارة وإرهاق', 'status': Appointment.Status.CONFIRMED},
        )
        Appointment.objects.get_or_create(
            patient=patients[1], scheduled_at=now.replace(hour=11, minute=30, second=0, microsecond=0),
            defaults={'dentist': doctors[1], 'reason': 'متابعة ضغط', 'status': Appointment.Status.SCHEDULED},
        )
        Appointment.objects.get_or_create(
            patient=patients[2], scheduled_at=(now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0),
            defaults={'dentist': doctors[0], 'reason': 'آلام في المعدة', 'status': Appointment.Status.SCHEDULED},
        )

        # Treatment records
        TreatmentRecord.objects.get_or_create(
            patient=patients[0],
            defaults={'dentist': doctors[0],
                      'complaint': 'ارتفاع في درجة الحرارة مع إرهاق عام منذ يومين',
                      'diagnosis': 'التهاب في الجهاز التنفسي العلوي',
                      'treatment': 'مضاد حيوي + خافض حرارة وراحة', 'cost': Decimal('300')},
        )

        # Invoice with a partial payment
        inv, created = Invoice.objects.get_or_create(
            patient=patients[0], defaults={'notes': 'كشف وتحاليل'},
        )
        if created:
            InvoiceItem.objects.create(invoice=inv, description='كشف',
                                       quantity=1, unit_price=Decimal('300'))
            InvoiceItem.objects.create(invoice=inv, description='تحاليل دم شاملة',
                                       quantity=1, unit_price=Decimal('450'))
            Payment.objects.create(invoice=inv, amount=Decimal('500'),
                                   method=Payment.Method.CASH)
            inv.refresh_status()

        self.stdout.write(self.style.SUCCESS('تم إنشاء البيانات التجريبية بنجاح ✅'))
        self.stdout.write('دخول: admin / admin123  |  الأطباء: dr.ahmed, dr.mona / pass1234')

        # ---- extended modules demo data ----
        from datetime import date, timedelta as td

        from apps.clinic.models import Branch
        from apps.billing.models import Installment
        from apps.inventory.models import Product, StockMovement, Supplier
        from apps.prescriptions.models import Prescription, PrescriptionItem
        from apps.records.models import TreatmentPlan, TreatmentPlanItem

        main_branch, _ = Branch.objects.get_or_create(
            name='الفرع الرئيسي', defaults={'address': 'سوهاج - شارع الجمهورية', 'phone': '0932345678'},
        )
        Branch.objects.get_or_create(
            name='فرع أخميم', defaults={'address': 'أخميم - الميدان', 'phone': '0934567890'},
        )
        User.objects.filter(branch__isnull=True).update(branch=main_branch)

        # Treatment plan
        plan, created = TreatmentPlan.objects.get_or_create(
            patient=patients[0], title='خطة علاج التهاب مزمن',
            defaults={'dentist': doctors[0], 'status': TreatmentPlan.Status.IN_PROGRESS},
        )
        if created:
            TreatmentPlanItem.objects.create(plan=plan, description='كشف وفحص شامل', cost=Decimal('300'), is_done=True, order=0)
            TreatmentPlanItem.objects.create(plan=plan, description='تحاليل دم ومتابعة', cost=Decimal('450'), order=1)
            TreatmentPlanItem.objects.create(plan=plan, description='جلسة متابعة نهائية', cost=Decimal('200'), order=2)

        # Prescription
        rx, created = Prescription.objects.get_or_create(
            patient=patients[0], dentist=doctors[0],
            defaults={'notes': 'بعد الأكل، مع شرب سوائل دافئة'},
        )
        if created:
            PrescriptionItem.objects.create(prescription=rx, drug_name='Augmentin 1g', dosage='قرص', frequency='كل 12 ساعة', duration='5 أيام')
            PrescriptionItem.objects.create(prescription=rx, drug_name='Paracetamol 500mg', dosage='قرص', frequency='كل 6 ساعات', duration='3 أيام')

        # Inventory
        supplier, _ = Supplier.objects.get_or_create(
            name='شركة الدلتا للمستلزمات الطبية', defaults={'phone': '01000000001'},
        )
        syringes, created = Product.objects.get_or_create(
            name='سرنجات 5 مل', defaults={'unit': 'علبة', 'min_quantity': 5, 'price': Decimal('80'), 'supplier': supplier},
        )
        if created:
            StockMovement.objects.create(product=syringes, movement_type='in', quantity=10, note='رصيد افتتاحي')
            StockMovement.objects.create(product=syringes, movement_type='out', quantity=7, note='استهلاك العيادة')
        gloves, created = Product.objects.get_or_create(
            name='قفازات لاتكس M', defaults={'unit': 'علبة', 'min_quantity': 10, 'price': Decimal('120'), 'supplier': supplier},
        )
        if created:
            StockMovement.objects.create(product=gloves, movement_type='in', quantity=30, note='رصيد افتتاحي')

        # Installments on a second invoice
        inv2, created = Invoice.objects.get_or_create(
            patient=patients[2], notes='تقسيط برنامج علاجي',
        )
        if created:
            InvoiceItem.objects.create(invoice=inv2, description='برنامج علاجي شامل', quantity=1, unit_price=Decimal('6000'))
            Installment.objects.create(invoice=inv2, due_date=date.today() - td(days=10), amount=Decimal('2000'))
            Installment.objects.create(invoice=inv2, due_date=date.today() + td(days=20), amount=Decimal('2000'))
            Installment.objects.create(invoice=inv2, due_date=date.today() + td(days=50), amount=Decimal('2000'))
            inv2.refresh_status()

        self.stdout.write(self.style.SUCCESS('تم إنشاء بيانات الوحدات الجديدة ✅'))

        # ---- drug catalog + expenses demo ----
        from apps.finance.models import Expense
        from apps.prescriptions.models import Drug

        drugs = [
            ('Augmentin 1g', 'قرص', 'كل 12 ساعة', '5 أيام'),
            ('Amoxicillin 500mg', 'كبسولة', 'كل 8 ساعات', '5 أيام'),
            ('Flagyl 500mg', 'قرص', 'كل 8 ساعات', '5 أيام'),
            ('Cataflam 50mg', 'قرص', 'عند اللزوم', '3 أيام'),
            ('Brufen 600mg', 'قرص', 'كل 8 ساعات بعد الأكل', '3 أيام'),
            ('Ketolac 10mg', 'قرص', 'عند الألم الشديد', 'يومان'),
            ('Antinal 200mg', 'كبسولة', 'كل 8 ساعات', '3 أيام'),
            ('Telfast 180mg', 'قرص', 'مرة يومياً', 'أسبوع'),
            ('Omeprazole 20mg', 'كبسولة', 'قبل الإفطار', 'أسبوعان'),
            ('Paracetamol 500mg', 'قرص', 'كل 6 ساعات', 'عند اللزوم'),
        ]
        for name, dosage, freq, dur in drugs:
            Drug.objects.get_or_create(
                name=name,
                defaults={'default_dosage': dosage, 'default_frequency': freq, 'default_duration': dur},
            )

        if not Expense.objects.exists():
            Expense.objects.create(date=date.today() - td(days=3), amount=Decimal('4500'),
                                   category='supplier', supplier=supplier, note='فاتورة مستلزمات')
            Expense.objects.create(date=date.today() - td(days=1), amount=Decimal('3000'),
                                   category='rent', note='إيجار شهر 7')

        self.stdout.write(self.style.SUCCESS('تم إنشاء قائمة الأدوية والمصروفات ✅'))
