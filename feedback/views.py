from django_filters import rest_framework as filters
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from feedback.models import Review, ReviewImage
from feedback.permissions import IsReviewOwner
from feedback.serializers import (
    ReviewImageSerializer,
    ReviewReplySerializer,
    ReviewSerializer,
)


class ReviewFilter(filters.FilterSet):
    class Meta:
        model = Review
        fields = ["product", "rating"]


class ReviewViewSet(viewsets.ModelViewSet):

    queryset = Review.objects.select_related("user", "product").prefetch_related(
        "replies__user", "images"
    )
    serializer_class = ReviewSerializer
    filterset_class = ReviewFilter

    def get_permissions(self):
        if self.action == "create" or self.action == "add_reply":
            return [IsAuthenticated()]

        if self.action in [
            "update",
            "partial_update",
            "destroy",
            "upload_images",
            "delete_image",
        ]:
            return [IsAuthenticated(), IsReviewOwner()]

        return [AllowAny()]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(
        detail=True,
        methods=["post"],
        url_path="images",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_images(self, request, pk=None):
        review = self.get_object()

        images = request.FILES.getlist("images")

        if not images:
            return Response(
                {"detail": "At least one image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        review_images = [
            ReviewImage.objects.create(review=review, image=image) for image in images
        ]

        serializer = ReviewImageSerializer(
            review_images,
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
        review = self.get_object()

        image = get_object_or_404(ReviewImage, id=image_id, review=review)
        image.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=True,
        methods=["post"],
        url_path="replies",
    )
    def add_reply(self, request, pk=None):
        review = self.get_object()

        serializer = ReviewReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(review=review, user=request.user)

        return Response(serializer.data, status=status.HTTP_201_CREATED)
