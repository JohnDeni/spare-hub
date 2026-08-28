from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Avg, Count
from django.db.models.signals import post_delete, post_save, pre_delete
from django.dispatch import receiver

from accounts.models import User
from core.models import Audit
from products.models import Product


class Review(Audit):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reviews",
    )

    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )

    comment = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review #{self.id} for product #{self.product_id}"


class ReviewReply(Audit):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="replies",
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="review_replies",
    )

    message = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Reply #{self.id} to review #{self.review_id}"


class ReviewImage(Audit):
    review = models.ForeignKey(
        Review,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(upload_to="reviews/")

    def __str__(self):
        return f"Image for review #{self.review_id}"


@receiver(pre_delete, sender=ReviewImage)
def delete_review_image_file(sender, instance, **kwargs):
    if instance.image:
        instance.image.delete(save=False)


def update_product_rating(product):
    aggregation = product.reviews.aggregate(
        average=Avg("rating"),
        count=Count("id"),
    )
    product.average_rating = aggregation["average"] or 0
    product.review_count = aggregation["count"] or 0
    product.save(update_fields=["average_rating", "review_count"])


@receiver(post_save, sender=Review)
def review_saved(sender, instance, **kwargs):
    update_product_rating(instance.product)


@receiver(post_delete, sender=Review)
def review_deleted(sender, instance, **kwargs):
    update_product_rating(instance.product)
