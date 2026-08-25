from rest_framework import serializers

from orders.models import Order, OrderDetail, OrderImage
from products.models import Product, ProductHistory


class OrderProductHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductHistory
        fields = [
            "product_history_id",
            "product_id",
            "name",
            "brand",
            "description",
            "price",
            "currency",
            "condition",
            "quantity",
        ]


class OrderDetailSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(),
        write_only=True,
    )

    product_id = serializers.IntegerField(
        source="product_history.product_id", read_only=True
    )

    product_history = OrderProductHistorySerializer(read_only=True)

    class Meta:
        model = OrderDetail
        fields = ["id", "product", "product_id", "product_history", "quantity"]
        read_only_fields = ["id", "product_id", "product_history"]


class OrderImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    details = OrderDetailSerializer(many=True, min_length=1)
    images = OrderImageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "status",
            "created_at",
            "updated_at",
            "details",
            "images",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    def create(self, validated_data):
        details_data = validated_data.pop("details")
        order = Order.objects.create(**validated_data)

        for item in details_data:
            product = item.pop("product")

            history = ProductHistory.objects.filter(product=product).latest(
                "created_at"
            )

            OrderDetail.objects.create(
                order=order,
                product_history=history,
                quantity=item["quantity"],
            )

        return order

    def update(self, instance, validated_data):
        details_data = validated_data.pop("details", None)

        instance.status = validated_data.get("status", instance.status)
        instance.save()

        if details_data is not None:
            instance.details.all().delete()
            for item in details_data:
                product = item.pop("product")

                history = ProductHistory.objects.filter(product=product).latest(
                    "created_at"
                )

                OrderDetail.objects.create(
                    order=instance,
                    product_history=history,
                    quantity=item["quantity"],
                )

        return instance
