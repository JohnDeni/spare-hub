from rest_framework import serializers

from accounts.serializers import SellerSerializer
from products.models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category
        fields = "__all__"


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "image", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):

    seller = SellerSerializer(read_only=True)

    category = CategorySerializer(
        many=True,
        read_only=True,
    )

    category_ids = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        many=True,
        source="category",
        write_only=True,
        required=False,
    )

    price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0,
    )

    images = ProductImageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "seller",
            "name",
            "brand",
            "description",
            "price",
            "currency",
            "condition",
            "quantity",
            "category",
            "category_ids",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["seller"]
