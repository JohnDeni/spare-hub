from rest_framework import serializers

from accounts.serializers import UserSerializer
from feedback.models import Review, ReviewImage, ReviewReply
from products.models import Product


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class ReviewReplySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ReviewReply
        fields = ["id", "user", "message", "created_at"]
        read_only_fields = ["id", "user", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
    )

    replies = ReviewReplySerializer(many=True, read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "user",
            "rating",
            "comment",
            "replies",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]

    def update(self, instance, validated_data):
        validated_data.pop("product", None)
        return super().update(instance, validated_data)
