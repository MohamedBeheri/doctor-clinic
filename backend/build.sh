#!/usr/bin/env bash
# Render build script — runs on every deploy.
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed demo data once only (skipped if users already exist).
python - <<'PY'
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.core.management import call_command
from apps.users.models import User
if not User.objects.exists():
    call_command('seed_demo')
    # Visit types + plan template
    from apps.clinic.models import VisitType, ClinicSettings
    from apps.records.models import PlanTemplate, PlanTemplateItem
    for code, name, en, price, o in [
        ('exam', 'كشف', 'Exam', 300, 0),
        ('re_exam', 'إعادة كشف', 'Re-exam', 150, 1),
        ('consultation', 'استشارة', 'Consultation', 0, 2),
        ('procedure', 'إجراء', 'Procedure', 0, 3),
    ]:
        VisitType.objects.get_or_create(code=code, defaults={'name': name, 'name_en': en, 'price': price, 'order': o})
    tpl, c = PlanTemplate.objects.get_or_create(name='برنامج متابعة ضغط وسكر', defaults={'description': 'كشف + تحاليل + متابعة شهرية'})
    if c:
        PlanTemplateItem.objects.create(template=tpl, description='كشف وفحص شامل', cost=300, order=0)
        PlanTemplateItem.objects.create(template=tpl, description='تحاليل دم شاملة', cost=450, order=1)
        PlanTemplateItem.objects.create(template=tpl, description='جلسة متابعة شهرية', cost=150, order=2)
    s = ClinicSettings.load()
    s.clinic_name = 'مركز الدكتور أحمد شحاتة'
    s.logo = 'clinic/logo.png'
    s.save()
    print('Seeded initial data.')
else:
    print('Data exists — seed skipped.')
PY
