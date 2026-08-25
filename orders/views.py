from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import Order, OrderImage
from orders.serializers import OrderImageSerializer, OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(
            "images", "details"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_images(self, request, pk=None):
        order = self.get_object()

        images = request.FILES.getlist("images")

        if not images:
            return Response(
                {"detail": "At least one image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_images = [
            OrderImage.objects.create(
                order=order,
                image=image,
            )
            for image in images
        ]

        serializer = OrderImageSerializer(
            order_images,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>\d+)",
    )
    def delete_image(self, request, pk=None, image_id=None):
        order = self.get_object()

        image = get_object_or_404(
            OrderImage,
            id=image_id,
            order=order,
        )

        image.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)
