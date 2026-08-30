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
    child_replies = serializers.SerializerMethodField()

    class Meta:
        model = ReviewReply
        fields = [
            "id",
            "user",
            "message",
            "parent_reply",
            "child_replies",
            "created_at",
        ]
        read_only_fields = ["id", "user", "created_at", "child_replies"]

    def get_child_replies(self, obj):
        return ReviewReplySerializer(
            obj.child_replies.all(), many=True, context=self.context
        ).data

    def validate_parent_reply(self, parent_reply):
        review = self.context.get("review")
        if review is not None and parent_reply.review_id != review.id:
            raise serializers.ValidationError(
                "Parent reply must belong to the same review."
            )
        return parent_reply


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
    )

    replies = serializers.SerializerMethodField()
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

    def get_replies(self, obj):
        top_level = [
            reply for reply in obj.replies.all() if reply.parent_reply_id is None
        ]
        return ReviewReplySerializer(top_level, many=True, context=self.context).data

    def update(self, instance, validated_data):
        validated_data.pop("product", None)
        return super().update(instance, validated_data)
