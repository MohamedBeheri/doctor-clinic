from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.billing.models import Payment
from apps.inventory.models import Supplier

from config.permissions import RoleWritePermission

from .models import Expense
from .serializers import ExpenseSerializer


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('supplier', 'created_by')
    serializer_class = ExpenseSerializer
    permission_classes = [RoleWritePermission]
    write_roles = ('receptionist', 'assistant')
    delete_roles = ()  # admin only
    filterset_fields = ['category', 'supplier']
    search_fields = ['note']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def finance_summary(request):
    """Clinic P&L for a period (?from=&to=, default current month) + supplier accounts."""
    from django.utils.dateparse import parse_date
    from apps.appointments.models import Appointment

    today = timezone.localdate()
    start = parse_date(request.query_params.get('from') or '') or today.replace(day=1)
    end = parse_date(request.query_params.get('to') or '') or today

    invoice_payments = Payment.objects.filter(
        paid_at__date__gte=start, paid_at__date__lte=end
    ).aggregate(t=Sum('amount'))['t'] or 0
    visit_fees = Appointment.objects.filter(
        fee_paid_at__date__gte=start, fee_paid_at__date__lte=end
    ).aggregate(t=Sum('fee'))['t'] or 0
    month_revenue = float(invoice_payments) + float(visit_fees)
    month_expenses = Expense.objects.filter(
        date__gte=start, date__lte=end
    ).aggregate(t=Sum('amount'))['t'] or 0

    expenses_by_category = list(
        Expense.objects.filter(date__gte=start, date__lte=end)
        .values('category')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )
    category_labels = dict(Expense.Category.choices)
    for row in expenses_by_category:
        row['category_display'] = str(category_labels.get(row['category'], row['category']))

    supplier_totals = []
    for supplier in Supplier.objects.all():
        paid = supplier.payments.aggregate(t=Sum('amount'))['t'] or 0
        supplier_totals.append({
            'id': supplier.id,
            'name': supplier.name,
            'paid': paid,
        })

    return Response({
        'from': start,
        'to': end,
        'invoice_payments': invoice_payments,
        'visit_fees': visit_fees,
        'month_revenue': month_revenue,
        'month_expenses': month_expenses,
        'month_net': month_revenue - float(month_expenses),
        'expenses_by_category': expenses_by_category,
        'supplier_totals': supplier_totals,
    })
