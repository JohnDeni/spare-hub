from django.core.validators import MinValueValidator
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from accounts.models import Seller
from core.models import Audit


class Category(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True,
    )

    def __str__(self):
        return self.name


class Product(Audit):

    class CurrencyChoices(models.TextChoices):
        USD = "USD", "US Dollar"
        EUR = "EUR", "Euro"
        UAH = "UAH", "Hryvnia"

    class ConditionChoices(models.TextChoices):
        NEW = "new", "New"
        USED = "used", "Used"
        REFURBISHED = "refurbished", "Refurbished"

    seller = models.ForeignKey(
        Seller,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
    )

    category = models.ManyToManyField(
        Category,
        related_name="products",
        blank=True,
    )

    name = models.CharField(max_length=255)

    brand = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    currency = models.CharField(
        max_length=3,
        choices=CurrencyChoices.choices,
        default=CurrencyChoices.USD,
    )

    condition = models.CharField(
        max_length=20,
        choices=ConditionChoices.choices,
        default=ConditionChoices.NEW,
    )

    quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return self.name


class ProductImage(Audit):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(upload_to="products/")

    def __str__(self):
        return f"Image for Product #{self.product_id}"


@receiver(pre_delete, sender=ProductImage)
def delete_product_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


class ProductHistory(Audit):
    product_history_id = models.BigAutoField(primary_key=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="history",
    )

    seller = models.ForeignKey(
        Seller,
        on_delete=models.SET_NULL,
        related_name="product_history",
        null=True,
        blank=True,
    )

    category = models.ManyToManyField(
        Category,
        related_name="product_history",
        blank=True,
    )

    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    currency = models.CharField(
        max_length=3,
        choices=Product.CurrencyChoices.choices,
    )

    condition = models.CharField(
        max_length=20,
        choices=Product.ConditionChoices.choices,
    )
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.name} (history)"
