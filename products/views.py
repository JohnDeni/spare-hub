from django.shortcuts import get_object_or_404
from django_filters import rest_framework as filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
)
from rest_framework.response import Response

from core.constants import IMAGE_DETAIL_URL_PATH
from products.models import Category, Product, ProductImage
from products.permissions import IsProductOwner, IsSeller
from products.serializers import (
    CategorySerializer,
    ProductImageSerializer,
    ProductSerializer,
)
from products.services import create_product_history


class NumberInFilter(filters.BaseInFilter, filters.NumberFilter):
    pass


class ProductFilter(filters.FilterSet):
    category = NumberInFilter(field_name="category__id")
    brand = filters.CharFilter(field_name="brand", lookup_expr="iexact")
    condition = filters.CharFilter(field_name="condition", lookup_expr="iexact")

    class Meta:
        model = Product
        fields = ["category", "brand", "condition"]


class ProductViewSet(viewsets.ModelViewSet):

    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ProductFilter

    search_fields = [
        "name",
        "brand",
        "description",
    ]

    ordering_fields = [
        "price",
        "created_at",
    ]

    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in [
            "update",
            "partial_update",
            "destroy",
            "upload_images",
            "delete_image",
        ]:
            return [IsAuthenticated(), IsProductOwner()]

        if self.action == "create":
            return [IsAuthenticated(), IsSeller()]

        if self.action == "my":
            return [IsAuthenticated()]

        return [AllowAny()]

    def get_queryset(self):
        qs = Product.objects.all()

        if self.action == "my":
            qs = qs.filter(seller__user=self.request.user)

        return qs.select_related("seller").prefetch_related("category", "images")

    def perform_create(self, serializer):
        product = serializer.save(
            seller=self.request.user.seller,
        )
        create_product_history(product)

    def perform_update(self, serializer):
        product = serializer.save()
        create_product_history(product)

    @action(detail=False, methods=["get"])
    def my(self, request):
        serializer = self.get_serializer(
            self.get_queryset(),
            many=True,
        )
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_images(self, request, pk=None):
        product = self.get_object()

        images = request.FILES.getlist("images")

        if not images:
            return Response(
                {"detail": "At least one image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product_images = [
            ProductImage.objects.create(
                product=product,
                image=image,
            )
            for image in images
        ]

        serializer = ProductImageSerializer(
            product_images,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=IMAGE_DETAIL_URL_PATH,
    )
    def delete_image(self, request, pk=None, image_id=None):
        product = self.get_object()

        image = get_object_or_404(
            ProductImage,
            id=image_id,
            product=product,
        )

        image.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


class CategoryViewSet(viewsets.ModelViewSet):

    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    filter_backends = [SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAdminUser()]

        return [AllowAny()]
