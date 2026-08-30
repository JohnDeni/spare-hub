from decimal import Decimal
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from feedback.models import Review, ReviewImage, ReviewReply
from feedback.permissions import IsReviewOwner
from feedback.serializers import ReviewSerializer
from products.models import Product


class BaseReviewTestCase(APITestCase):

    def setUp(self):
        self.reviews_url = "/api/reviews/"

        self.user = User.objects.create_user(
            email="buyer@test.com",
            password="StrongPass123",
        )

        self.other_user = User.objects.create_user(
            email="other@test.com",
            password="StrongPass123",
        )

        self.product = Product.objects.create(
            name="Brake Pad",
            brand="Bosch",
            description="Test description",
            price=Decimal("100.00"),
            currency="USD",
            condition="new",
            quantity=10,
        )

        self.other_product = Product.objects.create(
            name="Oil Filter",
            brand="Mann",
            price=Decimal("20.00"),
            currency="USD",
            condition="new",
            quantity=5,
        )

    def login(self, email, password):
        response = self.client.post(
            "/api/auth/token/",
            {"email": email, "password": password},
            format="json",
        )
        token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _make_image(self, name="test.jpg"):
        buffer = BytesIO()
        Image.new("RGB", (10, 10), "white").save(buffer, format="JPEG")
        buffer.seek(0)
        return SimpleUploadedFile(name, buffer.read(), content_type="image/jpeg")


class ReviewModelTests(BaseReviewTestCase):

    def test_create_review(self):
        review = Review.objects.create(
            product=self.product,
            user=self.user,
            rating=4,
            comment="Good part",
        )
        self.assertEqual(
            str(review), f"Review #{review.id} for product #{self.product.id}"
        )

    def test_rating_out_of_range_is_invalid(self):
        for rating in [0, 6]:
            with self.subTest(rating=rating):
                review = Review(
                    product=self.product, user=self.user, rating=rating, comment="Bad"
                )
                with self.assertRaises(ValidationError):
                    review.full_clean()

    def test_rating_within_range_is_valid(self):
        review = Review(product=self.product, user=self.user, rating=5, comment="Great")
        review.full_clean()

    def test_product_rating_updated_on_review_create(self):
        Review.objects.create(product=self.product, user=self.user, rating=4)
        Review.objects.create(product=self.product, user=self.other_user, rating=2)
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 2)
        self.assertEqual(self.product.average_rating, Decimal("3.00"))

    def test_product_rating_updated_on_review_update(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        review.rating = 2
        review.save()
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 1)
        self.assertEqual(self.product.average_rating, Decimal("2.00"))

    def test_product_rating_updated_on_review_delete(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        review.delete()
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 0)
        self.assertEqual(self.product.average_rating, Decimal("0.00"))

    def test_review_image_file_deleted_with_image(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=5)
        image = ReviewImage.objects.create(review=review, image=self._make_image())
        file_name = image.image.name
        image.delete()
        self.assertFalse(image.image.storage.exists(file_name))


class ReviewSerializerTests(BaseReviewTestCase):

    def test_serializer_contains_expected_fields(self):
        review = Review.objects.create(
            product=self.product,
            user=self.user,
            rating=5,
            comment="Excellent",
        )
        serializer = ReviewSerializer(review)
        data = serializer.data

        self.assertEqual(data["id"], review.id)
        self.assertEqual(data["product"], self.product.id)
        self.assertEqual(data["user"]["id"], self.user.id)
        self.assertEqual(data["rating"], 5)
        self.assertEqual(data["comment"], "Excellent")
        self.assertEqual(data["replies"], [])
        self.assertEqual(data["images"], [])

    def test_serializer_rejects_invalid_rating(self):
        serializer = ReviewSerializer(
            data={"product": self.product.id, "rating": 10, "comment": "Bad"}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("rating", serializer.errors)


class IsReviewOwnerPermissionTests(BaseReviewTestCase):

    def test_owner_has_object_permission(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        request = type("Request", (), {"method": "DELETE", "user": self.user})()
        self.assertTrue(IsReviewOwner().has_object_permission(request, None, review))

    def test_non_owner_denied_object_permission(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        request = type("Request", (), {"method": "DELETE", "user": self.other_user})()
        self.assertFalse(IsReviewOwner().has_object_permission(request, None, review))

    def test_safe_methods_allowed_for_anyone(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        request = type("Request", (), {"method": "GET", "user": self.other_user})()
        self.assertTrue(IsReviewOwner().has_object_permission(request, None, review))


class ReviewAPITests(BaseReviewTestCase):

    def test_create_review_requires_authentication(self):
        response = self.client.post(
            self.reviews_url,
            {"product": self.product.id, "rating": 5, "comment": "Great"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_create_review(self):
        self.login("buyer@test.com", "StrongPass123")
        response = self.client.post(
            self.reviews_url,
            {"product": self.product.id, "rating": 5, "comment": "Great part"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        review = Review.objects.get()
        self.assertEqual(review.user, self.user)
        self.assertEqual(review.product, self.product)
        self.assertEqual(review.rating, 5)

    def test_create_review_with_invalid_rating(self):
        self.login("buyer@test.com", "StrongPass123")
        response = self.client.post(
            self.reviews_url,
            {"product": self.product.id, "rating": 8, "comment": "Bad"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rating", response.data)

    def test_anyone_can_list_reviews(self):
        Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.get(self.reviews_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_list_reviews_filtered_by_product(self):
        Review.objects.create(product=self.product, user=self.user, rating=4)
        Review.objects.create(product=self.other_product, user=self.user, rating=2)
        response = self.client.get(self.reviews_url, {"product": self.product.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["product"], self.product.id)

    def test_retrieve_single_review(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.get(f"{self.reviews_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], review.id)

    def test_owner_can_update_own_review(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=3)
        response = self.client.patch(
            f"{self.reviews_url}{review.id}/",
            {"rating": 5, "comment": "Updated"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.rating, 5)
        self.assertEqual(review.comment, "Updated")

    def test_non_owner_cannot_update_review(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=3)
        response = self.client.patch(
            f"{self.reviews_url}{review.id}/",
            {"rating": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_own_review(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=3)
        response = self.client.delete(f"{self.reviews_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(id=review.id).exists())

    def test_non_owner_cannot_delete_review(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=3)
        response = self.client.delete(f"{self.reviews_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Review.objects.filter(id=review.id).exists())

    def test_product_rating_updated_after_create_via_api(self):
        self.login("buyer@test.com", "StrongPass123")
        self.client.post(
            self.reviews_url,
            {"product": self.product.id, "rating": 4, "comment": "Nice"},
            format="json",
        )
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 1)
        self.assertEqual(self.product.average_rating, Decimal("4.00"))

    def test_product_rating_updated_after_delete_via_api(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        self.client.delete(f"{self.reviews_url}{review.id}/")
        self.product.refresh_from_db()
        self.assertEqual(self.product.review_count, 0)
        self.assertEqual(self.product.average_rating, Decimal("0.00"))

    def test_reviews_are_paginated(self):
        for i in range(3):
            Review.objects.create(
                product=self.product,
                user=self.user if i % 2 == 0 else self.other_user,
                rating=(i % 5) + 1,
            )
        response = self.client.get(self.reviews_url, {"limit": 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["count"], 3)


class ReviewImageAPITests(BaseReviewTestCase):

    def test_owner_can_upload_images(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/images/",
            {"images": [self._make_image("one.jpg"), self._make_image("two.jpg")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(review.images.count(), 2)

    def test_upload_images_requires_files(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/images/",
            {},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_owner_cannot_upload_images(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/images/",
            {"images": [self._make_image()]},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_image(self):
        self.login("buyer@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        image = ReviewImage.objects.create(review=review, image=self._make_image())
        response = self.client.delete(
            f"{self.reviews_url}{review.id}/images/{image.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ReviewImage.objects.filter(id=image.id).exists())

    def test_image_endpoints_require_authentication(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/images/",
            {"images": [self._make_image()]},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ReviewReplyAPITests(BaseReviewTestCase):

    def test_authenticated_user_can_add_reply(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/replies/",
            {"message": "Thanks for the feedback!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(review.replies.count(), 1)
        reply = review.replies.first()
        self.assertEqual(reply.user, self.other_user)
        self.assertEqual(reply.message, "Thanks for the feedback!")

    def test_reply_requires_authentication(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/replies/",
            {"message": "Hello"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_reply_requires_message(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        response = self.client.post(
            f"{self.reviews_url}{review.id}/replies/",
            {"message": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_review_response_includes_replies(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        ReviewReply.objects.create(review=review, user=self.other_user, message="Hi")
        response = self.client.get(f"{self.reviews_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["replies"]), 1)
        self.assertEqual(response.data["replies"][0]["message"], "Hi")

    def test_can_reply_to_a_reply(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        top_reply = ReviewReply.objects.create(
            review=review, user=self.user, message="Thanks!"
        )
        response = self.client.post(
            f"{self.reviews_url}{review.id}/replies/",
            {"message": "No problem", "parent_reply": top_reply.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(top_reply.child_replies.count(), 1)
        self.assertEqual(top_reply.child_replies.first().message, "No problem")

    def test_nested_replies_appear_under_parent_in_response(self):
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        top_reply = ReviewReply.objects.create(
            review=review, user=self.user, message="Thanks!"
        )
        ReviewReply.objects.create(
            review=review,
            user=self.other_user,
            message="No problem",
            parent_reply=top_reply,
        )
        response = self.client.get(f"{self.reviews_url}{review.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["replies"]), 1)
        children = response.data["replies"][0]["child_replies"]
        self.assertEqual(len(children), 1)
        self.assertEqual(children[0]["message"], "No problem")

    def test_cannot_reply_to_a_reply_from_another_review(self):
        self.login("other@test.com", "StrongPass123")
        review = Review.objects.create(product=self.product, user=self.user, rating=4)
        other_review = Review.objects.create(
            product=self.other_product, user=self.user, rating=3
        )
        foreign_reply = ReviewReply.objects.create(
            review=other_review, user=self.user, message="Unrelated"
        )
        response = self.client.post(
            f"{self.reviews_url}{review.id}/replies/",
            {"message": "Hi", "parent_reply": foreign_reply.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent_reply", response.data)
