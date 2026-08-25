from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from accounts.models import User
from core.models import Audit
from products.models import ProductHistory


class Order(Audit):

    class StatusChoices(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="orders",
    )

    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
    )

    def __str__(self):
        return f"Order #{self.id}"


class OrderDetail(Audit):

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="details",
    )

    product_history = models.ForeignKey(
        ProductHistory,
        on_delete=models.PROTECT,
        related_name="order_details",
    )

    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    def __str__(self):
        return f"Order #{self.order_id} - {self.product_history.name}"


class OrderImage(Audit):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(upload_to="orders/")

    def __str__(self):
        return f"Image for Order #{self.order_id}"


@receiver(pre_delete, sender=OrderImage)
def delete_order_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)
