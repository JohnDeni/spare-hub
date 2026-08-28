from django.contrib import admin

from orders.models import Order, OrderDetail

admin.site.register(Order)
admin.site.register(OrderDetail)
