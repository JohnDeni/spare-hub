from django.contrib import admin

from orders.models import Order, OrderDetail, OrderImage

admin.site.register(Order)
admin.site.register(OrderDetail)
admin.site.register(OrderImage)
