from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, finance_summary

router = DefaultRouter()
router.register('expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('summary/', finance_summary, name='finance_summary'),
] + router.urls
