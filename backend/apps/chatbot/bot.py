"""
Stateful WhatsApp booking bot — step-by-step conversation flow.
Designed to be swapped with AI-powered logic later.
"""
import re
from datetime import datetime, time, timedelta

from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinic.models import ClinicSettings
from apps.patients.models import Patient

from .models import ChatSession

WORKING_HOURS = (time(9, 0), time(21, 0))
SLOT_MINUTES = 30

GREETING_KEYWORDS = {'حجز', 'موعد', 'book', 'hi', 'hello', 'مرحبا', 'مرحبًا', 'السلام', 'اهلا', 'أهلا', 'هاي', 'هلو'}
CANCEL_KEYWORDS = {'الغاء', 'إلغاء', 'cancel', 'لا', 'خروج', 'exit'}
CONFIRM_KEYWORDS = {'نعم', 'أيوه', 'ايوه', 'اه', 'تمام', 'ok', 'yes', 'اوك', 'موافق', 'أكيد'}


def _normalize_phone(phone: str) -> str:
    phone = re.sub(r'[^\d]', '', phone)
    if phone.startswith('0'):
        settings = ClinicSettings.load()
        phone = settings.whatsapp_country_code + phone[1:]
    return phone


def _parse_date(text: str):
    text = text.strip()
    today = timezone.localdate()
    if text in ('اليوم', 'today', 'النهارده', 'النهاردة'):
        return today
    if text in ('بكرة', 'بكره', 'غدا', 'غداً', 'tomorrow'):
        return today + timedelta(days=1)
    if text in ('بعد بكرة', 'بعد بكره'):
        return today + timedelta(days=2)
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y', '%d/%m', '%d-%m'):
        try:
            d = datetime.strptime(text, fmt).date()
            if d.year == 1900:
                d = d.replace(year=today.year)
            return d
        except ValueError:
            continue
    return None


def _parse_time(text: str):
    text = text.strip().replace(':', ':')
    m = re.match(r'^(\d{1,2})[:\.]?(\d{2})?\s*(ص|م|am|pm|AM|PM)?$', text)
    if not m:
        return None
    h = int(m.group(1))
    mi = int(m.group(2) or 0)
    period = (m.group(3) or '').lower()
    if period in ('م', 'pm') and h < 12:
        h += 12
    if period in ('ص', 'am') and h == 12:
        h = 0
    if h > 23 or mi > 59:
        return None
    return time(h, mi)


def _available_slots(date, n=6):
    start, end = WORKING_HOURS
    existing = set(
        Appointment.objects.filter(
            scheduled_at__date=date,
        ).exclude(
            status__in=['cancelled', 'no_show']
        ).values_list('scheduled_at__hour', 'scheduled_at__minute')
    )
    slots = []
    current = datetime.combine(date, start)
    end_dt = datetime.combine(date, end)
    while current < end_dt and len(slots) < n:
        if (current.hour, current.minute) not in existing:
            slots.append(current.time())
        current += timedelta(minutes=SLOT_MINUTES)
    return slots


def _format_slots(slots):
    lines = [f'  {i+1}. {s.strftime("%I:%M %p")}' for i, s in enumerate(slots)]
    return '\n'.join(lines)


def handle_message(wa_id: str, text: str) -> str:
    """Process an incoming message and return the bot's reply."""
    text = text.strip()
    session, _ = ChatSession.objects.get_or_create(wa_id=wa_id)
    settings = ClinicSettings.load()
    clinic = settings.clinic_name

    if any(k in text.lower() for k in CANCEL_KEYWORDS) and session.step != ChatSession.Step.IDLE:
        session.reset()
        return f'تم الإلغاء. أرسل "حجز" في أي وقت لحجز موعد جديد في {clinic} 🩺'

    # IDLE — waiting for trigger
    if session.step == ChatSession.Step.IDLE:
        if any(k in text.lower() for k in GREETING_KEYWORDS):
            existing = Patient.objects.filter(phone__endswith=wa_id[-10:]).first()
            if existing:
                session.patient = existing
                session.patient_name = existing.full_name
                session.step = ChatSession.Step.ASK_DATE
                session.save()
                return (
                    f'أهلاً {existing.full_name}! 🩺\n'
                    f'أهلا بيك في {clinic}.\n\n'
                    f'متى تحب تحجز؟\n'
                    f'اكتب التاريخ (مثلاً: اليوم، بكرة، 25/07)\n'
                    f'أو "إلغاء" للخروج.'
                )
            session.step = ChatSession.Step.ASK_NAME
            session.save()
            return (
                f'أهلاً بيك في {clinic}! 🩺\n'
                f'عشان نحجزلك، ممكن اسمك الكامل؟'
            )
        return (
            f'مرحباً بك في {clinic} 🩺\n'
            f'أرسل كلمة "حجز" لحجز موعد.'
        )

    # ASK_NAME
    if session.step == ChatSession.Step.ASK_NAME:
        if len(text) < 3 or text.isdigit() or text.lower() in GREETING_KEYWORDS:
            return 'من فضلك اكتب اسمك الكامل (مثلاً: محمد أحمد علي)'
        session.patient_name = text
        patient = Patient.objects.filter(phone__endswith=wa_id[-10:]).first()
        if patient:
            session.patient = patient
            patient.full_name = text
            patient.save(update_fields=['full_name'])
        session.step = ChatSession.Step.ASK_DATE
        session.save()
        return (
            f'أهلاً {text}! 👋\n\n'
            f'متى تحب تحجز؟\n'
            f'اكتب التاريخ (مثلاً: اليوم، بكرة، 25/07)\n'
            f'أو "إلغاء" للخروج.'
        )

    # ASK_DATE
    if session.step == ChatSession.Step.ASK_DATE:
        date = _parse_date(text)
        if not date:
            return 'مش قادر أفهم التاريخ 😅\nمن فضلك اكتبه كده:\n  اليوم / بكرة / 25/07 / 2026-07-25'
        if date < timezone.localdate():
            return 'التاريخ ده فات! من فضلك اختار تاريخ قادم.'
        slots = _available_slots(date)
        if not slots:
            return f'للأسف مفيش مواعيد متاحة يوم {date.strftime("%d/%m/%Y")} 😔\nجرب يوم تاني.'
        session.chosen_date = date
        session.step = ChatSession.Step.ASK_TIME
        session.save()
        return (
            f'المواعيد المتاحة يوم {date.strftime("%d/%m/%Y")}:\n\n'
            f'{_format_slots(slots)}\n\n'
            f'اكتب رقم الموعد أو الوقت مباشرة (مثلاً: 3 أو 2:30 م)'
        )

    # ASK_TIME
    if session.step == ChatSession.Step.ASK_TIME:
        slots = _available_slots(session.chosen_date, n=20)
        chosen = None
        if text.isdigit():
            idx = int(text) - 1
            if 0 <= idx < len(slots):
                chosen = slots[idx]
        if not chosen:
            chosen = _parse_time(text)
        if not chosen:
            return 'مش قادر أفهم الوقت 😅\nاكتب رقم الموعد من القائمة أو الوقت مباشرة (مثلاً: 10:00 ص)'
        if chosen < WORKING_HOURS[0] or chosen >= WORKING_HOURS[1]:
            return f'ساعات العمل من {WORKING_HOURS[0].strftime("%I:%M %p")} لـ {WORKING_HOURS[1].strftime("%I:%M %p")}'
        session.chosen_time = chosen
        session.step = ChatSession.Step.CONFIRM
        session.save()
        return (
            f'تأكيد الحجز 📋\n\n'
            f'👤 الاسم: {session.patient_name}\n'
            f'📅 التاريخ: {session.chosen_date.strftime("%d/%m/%Y")}\n'
            f'🕐 الوقت: {session.chosen_time.strftime("%I:%M %p")}\n'
            f'🏥 العيادة: {clinic}\n\n'
            f'اكتب "تمام" للتأكيد أو "إلغاء".'
        )

    # CONFIRM
    if session.step == ChatSession.Step.CONFIRM:
        if not any(k in text.lower() for k in CONFIRM_KEYWORDS):
            return 'اكتب "تمام" لتأكيد الحجز أو "إلغاء" للإلغاء.'

        patient = session.patient
        if not patient:
            patient = Patient.objects.create(
                full_name=session.patient_name,
                phone=wa_id,
            )
            session.patient = patient

        scheduled = datetime.combine(session.chosen_date, session.chosen_time)
        scheduled = timezone.make_aware(scheduled)

        appt = Appointment.objects.create(
            patient=patient,
            scheduled_at=scheduled,
            source=Appointment.Source.WHATSAPP,
            reason='حجز عبر واتساب',
        )

        session.reset()
        return (
            f'تم الحجز بنجاح! ✅🩺\n\n'
            f'📋 رقم الحجز: #{appt.id}\n'
            f'👤 الاسم: {patient.full_name}\n'
            f'📅 التاريخ: {appt.scheduled_at.strftime("%d/%m/%Y")}\n'
            f'🕐 الوقت: {appt.scheduled_at.strftime("%I:%M %p")}\n\n'
            f'نسعد بخدمتكم في {clinic}!\n'
            f'لحجز موعد جديد أرسل "حجز".'
        )

    session.reset()
    return 'حدث خطأ. أرسل "حجز" لبدء حجز جديد.'
