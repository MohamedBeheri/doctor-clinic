from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.appointments.models import Appointment
from apps.billing.models import Installment, Invoice, Payment
from apps.finance.models import Expense
from apps.inventory.models import Product
from apps.patients.models import Patient
from apps.prescriptions.models import Prescription
from apps.records.models import TreatmentRecord
from apps.users.models import User


def _range(request):
    """Parse ?from=&to= into dates (defaults: current month)."""
    today = timezone.localdate()
    start = parse_date(request.query_params.get('from') or '') or today.replace(day=1)
    end = parse_date(request.query_params.get('to') or '') or today
    return start, end


def _revenue(start, end):
    """Total money in: invoice payments + collected visit fees."""
    payments = Payment.objects.filter(paid_at__date__gte=start, paid_at__date__lte=end).aggregate(
        t=Sum('amount')
    )['t'] or 0
    fees = Appointment.objects.filter(
        fee_paid_at__date__gte=start, fee_paid_at__date__lte=end
    ).aggregate(t=Sum('fee'))['t'] or 0
    return payments, fees


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    today = timezone.localdate()
    start, end = _range(request)

    date_filtered = bool(request.query_params.get('from') or request.query_params.get('to'))

    appointments_qs = Appointment.objects.filter(
        scheduled_at__date__gte=start, scheduled_at__date__lte=end
    )
    unpaid = Invoice.objects.exclude(status__in=[Invoice.Status.PAID, Invoice.Status.CANCELLED])
    if date_filtered:
        unpaid = unpaid.filter(created_at__date__gte=start, created_at__date__lte=end)
    payments, fees = _revenue(start, end)

    from django.db.models.functions import TruncDate
    revenue_by_day = [
        {'date': r['day'].isoformat(), 'total': float(r['total'] or 0)}
        for r in (
            Payment.objects.filter(paid_at__date__gte=start, paid_at__date__lte=end)
            .annotate(day=TruncDate('paid_at'))
            .values('day')
            .annotate(total=Sum('amount'))
            .order_by('day')
        )
    ]
    fee_by_day = dict(
        Appointment.objects.filter(
            fee_paid_at__date__gte=start, fee_paid_at__date__lte=end,
        )
        .annotate(day=TruncDate('fee_paid_at'))
        .values('day')
        .annotate(total=Sum('fee'))
        .values_list('day', 'total')
    )
    for entry in revenue_by_day:
        d = parse_date(entry['date'])
        entry['total'] += float(fee_by_day.get(d, 0))
    for d, v in fee_by_day.items():
        if d.isoformat() not in {e['date'] for e in revenue_by_day}:
            revenue_by_day.append({'date': d.isoformat(), 'total': float(v)})
    revenue_by_day.sort(key=lambda e: e['date'])

    patients_total = Patient.objects.count()
    if date_filtered:
        patients_total = Patient.objects.filter(
            created_at__date__gte=start, created_at__date__lte=end
        ).count()

    todays_appointments = Appointment.objects.filter(scheduled_at__date=today)
    visit_counts = dict(
        appointments_qs.values_list('visit_type').annotate(total=Count('id'))
    )

    prescriptions_qs = Prescription.objects.all()
    records_qs = TreatmentRecord.objects.all()
    if date_filtered:
        prescriptions_qs = prescriptions_qs.filter(created_at__date__gte=start, created_at__date__lte=end)
        records_qs = records_qs.filter(created_at__date__gte=start, created_at__date__lte=end)

    return Response({
        'from': start, 'to': end,
        'patients_total': patients_total,
        'appointments_today': appointments_qs.count(),
        'appointments_today_list': [
            {
                'id': a.id,
                'patient_name': a.patient.full_name,
                'scheduled_at': a.scheduled_at,
                'status': a.status,
                'visit_type': a.visit_type,
                'fee': a.fee,
                'fee_paid': bool(a.fee_paid_at),
                'dentist_name': a.dentist.full_name if a.dentist else None,
            }
            for a in appointments_qs.select_related('patient', 'dentist').order_by('scheduled_at')
        ],
        'unpaid_invoices': unpaid.count(),
        'outstanding_balance': sum(inv.balance for inv in unpaid),
        'month_revenue': payments + fees,
        'prescriptions_total': prescriptions_qs.count(),
        'records_total': records_qs.count(),
        'dentists_total': User.objects.filter(role='dentist', is_active=True).count(),
        'revenue_by_day': revenue_by_day,
        'visit_counts_today': visit_counts,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications(request):
    """Computed in-app alerts: appointments, overdue installments, low stock."""
    today = timezone.localdate()
    now = timezone.now()
    alerts = []
    en = request.query_params.get('lang') == 'en'

    upcoming = Appointment.objects.filter(
        scheduled_at__gte=now,
        scheduled_at__date=today,
        status__in=[Appointment.Status.SCHEDULED, Appointment.Status.CONFIRMED],
    ).select_related('patient')
    for a in upcoming:
        hhmm = a.scheduled_at.astimezone().strftime('%H:%M')
        alerts.append({
            'type': 'appointment',
            'severity': 'info',
            'title': f'Appointment today {hhmm}' if en else f'موعد اليوم {hhmm}',
            'message': f'{a.patient.full_name}{" — " + a.reason if a.reason else ""}',
            'link': '/appointments',
        })

    overdue = Installment.objects.filter(
        paid_at__isnull=True, due_date__lt=today,
    ).select_related('invoice__patient')
    for i in overdue:
        alerts.append({
            'type': 'installment',
            'severity': 'error',
            'title': f'Installment overdue since {i.due_date}' if en else f'قسط متأخر منذ {i.due_date}',
            'message': (
                f'{i.invoice.patient.full_name} — {i.amount} EGP (invoice {i.invoice.number})'
                if en else
                f'{i.invoice.patient.full_name} — {i.amount} ج.م (فاتورة {i.invoice.number})'
            ),
            'link': '/invoices',
        })

    due_soon = Installment.objects.filter(
        paid_at__isnull=True,
        due_date__gte=today,
        due_date__lte=today + timedelta(days=7),
    ).select_related('invoice__patient')
    for i in due_soon:
        alerts.append({
            'type': 'installment',
            'severity': 'warning',
            'title': f'Installment due {i.due_date}' if en else f'قسط يستحق {i.due_date}',
            'message': (
                f'{i.invoice.patient.full_name} — {i.amount} EGP'
                if en else
                f'{i.invoice.patient.full_name} — {i.amount} ج.م'
            ),
            'link': '/invoices',
        })

    for p in Product.objects.all():
        if p.is_low:
            alerts.append({
                'type': 'stock',
                'severity': 'warning',
                'title': 'Low stock' if en else 'نقص مخزون',
                'message': (
                    f'{p.name}: {p.quantity} {p.unit} left (min {p.min_quantity})'
                    if en else
                    f'{p.name}: المتبقي {p.quantity} {p.unit} (الحد {p.min_quantity})'
                ),
                'link': '/inventory',
            })

    return Response({'count': len(alerts), 'alerts': alerts})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def reports_summary(request):
    """Monthly revenue, appointment status breakdown, and new patients (last 6 months)."""
    today = timezone.localdate()
    six_months_ago = (today.replace(day=1) - timedelta(days=150)).replace(day=1)

    revenue_by_month = (
        Payment.objects.filter(paid_at__date__gte=six_months_ago)
        .annotate(month=TruncMonth('paid_at'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )
    patients_by_month = (
        Patient.objects.filter(created_at__date__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(total=Count('id'))
        .order_by('month')
    )
    month_start = today.replace(day=1)
    appointments_by_status = (
        Appointment.objects.filter(scheduled_at__date__gte=month_start)
        .values('status')
        .annotate(total=Count('id'))
        .order_by('-total')
    )
    top_dentists = (
        Appointment.objects.filter(
            scheduled_at__date__gte=month_start,
            dentist__isnull=False,
        )
        .values('dentist__full_name')
        .annotate(total=Count('id'))
        .order_by('-total')[:5]
    )

    tiles = {
        'total_appointments': Appointment.objects.count(),
        'total_patients': Patient.objects.count(),
        'total_dentists': User.objects.filter(role='dentist', is_active=True).count(),
        'cancelled': Appointment.objects.filter(status='cancelled').count(),
        'completed': Appointment.objects.filter(status='completed').count(),
        'today': Appointment.objects.filter(scheduled_at__date=today).count(),
    }

    return Response({
        'tiles': tiles,
        'revenue_by_month': [
            {'month': r['month'].strftime('%Y-%m'), 'total': r['total']}
            for r in revenue_by_month
        ],
        'patients_by_month': [
            {'month': r['month'].strftime('%Y-%m'), 'total': r['total']}
            for r in patients_by_month
        ],
        'appointments_by_status': list(appointments_by_status),
        'top_dentists': list(top_dentists),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_report(request, pk):
    """Full patient report within an optional date range."""
    start, end = _range(request)
    try:
        patient = Patient.objects.get(pk=pk)
    except Patient.DoesNotExist:
        return Response({'detail': 'not found'}, status=404)

    records = patient.treatment_records.filter(
        created_at__date__gte=start, created_at__date__lte=end
    ).select_related('dentist')
    appointments = patient.appointments.filter(
        scheduled_at__date__gte=start, scheduled_at__date__lte=end
    ).select_related('dentist')
    invoices = patient.invoices.filter(created_at__date__gte=start, created_at__date__lte=end)
    prescriptions = patient.prescriptions.filter(
        created_at__date__gte=start, created_at__date__lte=end
    ).prefetch_related('items')

    fees_paid = appointments.filter(fee_paid_at__isnull=False).aggregate(t=Sum('fee'))['t'] or 0
    inv_list = [
        {
            'number': i.number, 'date': i.created_at.date(), 'total': i.total,
            'paid': i.paid_amount, 'balance': i.balance, 'status': i.status,
        }
        for i in invoices
    ]

    return Response({
        'patient': {
            'id': patient.id, 'file_number': patient.file_number,
            'full_name': patient.full_name, 'phone': patient.phone,
            'age': patient.age, 'gender': patient.gender,
            'allergies': patient.allergies, 'chronic_diseases': patient.chronic_diseases,
        },
        'from': start, 'to': end,
        'records': [
            {
                'date': r.created_at.date(), 'diagnosis': r.diagnosis,
                'treatment': r.treatment, 'cost': r.cost,
                'dentist': r.dentist.full_name if r.dentist else None,
            }
            for r in records
        ],
        'appointments': [
            {
                'date': a.scheduled_at, 'visit_type': a.visit_type, 'status': a.status,
                'fee': a.fee, 'fee_paid': bool(a.fee_paid_at),
                'dentist': a.dentist.full_name if a.dentist else None,
            }
            for a in appointments
        ],
        'invoices': inv_list,
        'prescriptions_count': prescriptions.count(),
        'totals': {
            'records_cost': records.aggregate(t=Sum('cost'))['t'] or 0,
            'invoiced': sum(i['total'] for i in inv_list),
            'paid': sum(i['paid'] for i in inv_list),
            'balance': sum(i['balance'] for i in inv_list),
            'visit_fees_paid': fees_paid,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dentist_report(request, pk):
    """Dentist activity + collections within a date range."""
    start, end = _range(request)
    try:
        dentist = User.objects.get(pk=pk, role='dentist')
    except User.DoesNotExist:
        return Response({'detail': 'not found'}, status=404)

    appts = Appointment.objects.filter(
        dentist=dentist, scheduled_at__date__gte=start, scheduled_at__date__lte=end,
    ).select_related('patient')
    records = TreatmentRecord.objects.filter(
        dentist=dentist, created_at__date__gte=start, created_at__date__lte=end,
    ).select_related('patient')

    by_type = {
        row['visit_type']: {'count': row['c'], 'fees': float(row['f'] or 0)}
        for row in appts.values('visit_type').annotate(c=Count('id'), f=Sum('fee', filter=Q(fee_paid_at__isnull=False)))
    }

    return Response({
        'dentist': {'id': dentist.id, 'name': dentist.full_name, 'specialty': dentist.specialty},
        'from': start, 'to': end,
        'visits': [
            {
                'date': a.scheduled_at, 'patient': a.patient.full_name,
                'visit_type': a.visit_type, 'status': a.status,
                'fee': a.fee, 'fee_paid': bool(a.fee_paid_at), 'reason': a.reason,
            }
            for a in appts.order_by('scheduled_at')
        ],
        'by_type': by_type,
        'totals': {
            'visits': appts.count(),
            'unique_patients': appts.values('patient').distinct().count(),
            'fees_collected': appts.filter(fee_paid_at__isnull=False).aggregate(t=Sum('fee'))['t'] or 0,
            'fees_uncollected': appts.filter(fee_paid_at__isnull=True, fee__gt=0).aggregate(t=Sum('fee'))['t'] or 0,
            'treatments': records.count(),
            'treatments_value': records.aggregate(t=Sum('cost'))['t'] or 0,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_day_statement(request):
    """End-of-day statement a dentist reviews with reception: visits + money."""
    date = parse_date(request.query_params.get('date') or '') or timezone.localdate()
    dentist_id = request.query_params.get('dentist')

    appts = Appointment.objects.filter(scheduled_at__date=date).select_related('patient', 'dentist')
    if dentist_id:
        appts = appts.filter(dentist_id=dentist_id)

    visits = [
        {
            'time': a.scheduled_at, 'patient': a.patient.full_name,
            'dentist': a.dentist.full_name if a.dentist else None,
            'visit_type': a.visit_type, 'status': a.status,
            'fee': a.fee, 'fee_paid': bool(a.fee_paid_at),
        }
        for a in appts.order_by('scheduled_at')
    ]

    collected = appts.filter(fee_paid_at__isnull=False).aggregate(t=Sum('fee'))['t'] or 0
    uncollected = appts.filter(fee_paid_at__isnull=True, fee__gt=0).aggregate(t=Sum('fee'))['t'] or 0

    # Invoice payments taken today (linked to this dentist's patients when filtered)
    payments_qs = Payment.objects.filter(paid_at__date=date)
    if dentist_id:
        payments_qs = payments_qs.filter(invoice__patient__appointments__dentist_id=dentist_id).distinct()
    invoice_payments = payments_qs.aggregate(t=Sum('amount'))['t'] or 0

    return Response({
        'date': date,
        'visits': visits,
        'totals': {
            'visits': len(visits),
            'fees_collected': collected,
            'fees_uncollected': uncollected,
            'invoice_payments': invoice_payments,
            'total_cash': float(collected) + float(invoice_payments),
        },
    })
