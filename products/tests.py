from decimal import Decimal
from io import BytesIO

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import Seller
from products.models import Category, Product, ProductImage

User = get_user_model()


class BaseProductTestCase(APITestCase):

    def setUp(self):
        self.products_url = "/api/products/"
        self.my_products_url = "/api/products/my/"

        self.seller_user = User.objects.create_user(
            email="seller@test.com",
            password="StrongPass123",
        )

        self.other_user = User.objects.create_user(
            email="other@test.com",
            password="StrongPass123",
        )

        self.buyer = User.objects.create_user(
            email="buyer@test.com",
            password="StrongPass123",
        )

        self.seller = Seller.objects.create(
            user=self.seller_user,
            company_name="Test Seller",
        )

        self.other_seller = Seller.objects.create(
            user=self.other_user,
            company_name="Other Seller",
        )

        self.product = Product.objects.create(
            seller=self.seller,
            name="iPhone",
            brand="Apple",
            description="Phone",
            price=Decimal("1000.00"),
            quantity=1,
        )

        self.product_url = f"/api/products/{self.product.id}/"

        self.admin = User.objects.create_superuser(
            email="admin@test.com",
            password="StrongPass123",
        )

    def _make_image(self, name="test.jpg"):
        buffer = BytesIO()
        Image.new("RGB", (10, 10), "white").save(buffer, format="JPEG")
        buffer.seek(0)
        return SimpleUploadedFile(name, buffer.read(), content_type="image/jpeg")

    def login(self, email, password):
        response = self.client.post(
            "/api/auth/token/",
            {
                "email": email,
                "password": password,
            },
            format="json",
        )

        token = response.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


class ProductListTests(BaseProductTestCase):

    def setUp(self):
        super().setUp()

        Product.objects.create(
            seller=self.seller,
            name="MacBook",
            brand="Apple",
            condition="new",
            price="2000.00",
            quantity=1,
        )

        Product.objects.create(
            seller=self.other_seller,
            name="Galaxy",
            brand="Samsung",
            condition="used",
            price="500.00",
            quantity=1,
        )

        Product.objects.create(
            seller=self.other_seller,
            name="ThinkPad",
            brand="Lenovo",
            condition="new",
            price="1000.00",
            quantity=1,
        )

    def test_products_pagination(self):

        response = self.client.get(f"{self.products_url}?limit=2")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["count"], 4)

    def test_filter_products_by_brand(self):

        response = self.client.get(f"{self.products_url}?brand=Apple")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

        for product in response.data["results"]:
            self.assertEqual(product["brand"], "Apple")

    def test_filter_products_by_condition(self):

        response = self.client.get(f"{self.products_url}?condition=new")

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["count"], 3)

        for product in response.data["results"]:
            self.assertEqual(product["condition"], "new")

    def test_search_products(self):

        response = self.client.get(f"{self.products_url}?search=Galaxy")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Galaxy")

    def test_order_products_by_price(self):

        response = self.client.get(f"{self.products_url}?ordering=price")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        prices = [float(product["price"]) for product in response.data["results"]]

        self.assertEqual(prices, sorted(prices))

    def test_list_products(self):

        response = self.client.get(self.products_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        expected_count = Product.objects.count()

        self.assertEqual(response.data["count"], expected_count)
        self.assertEqual(len(response.data["results"]), expected_count)

    def test_list_products_as_buyer(self):
        self.login(
            "buyer@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], Product.objects.count())
        self.assertEqual(len(response.data["results"]), Product.objects.count())

    def test_list_products_as_seller(self):
        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.products_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], Product.objects.count())
        self.assertEqual(len(response.data["results"]), Product.objects.count())


class ProductCreateTests(BaseProductTestCase):

    def test_seller_can_create_product(self):
        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        before_count = Product.objects.count()

        response = self.client.post(
            self.products_url,
            {
                "name": "MacBook",
                "brand": "Apple",
                "description": "Laptop",
                "price": "2000.00",
                "currency": "USD",
                "condition": "new",
                "quantity": 5,
            },
            format="json",
        )

        after_count = Product.objects.count()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(after_count, before_count + 1)

        product = Product.objects.latest("id")

        self.assertEqual(product.name, "MacBook")
        self.assertEqual(product.brand, "Apple")
        self.assertEqual(str(product.price), "2000.00")
        self.assertEqual(product.quantity, 5)

    def test_buyer_cannot_create_product(self):
        self.login(
            "buyer@test.com",
            "StrongPass123",
        )

        response = self.client.post(
            self.products_url,
            {
                "name": "MacBook",
                "brand": "Apple",
                "price": "1000",
                "quantity": 1,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_product_without_login(self):
        before_count = Product.objects.count()

        response = self.client.post(
            self.products_url,
            {
                "name": "MacBook",
                "brand": "Apple",
                "description": "Laptop",
                "price": "2000.00",
                "currency": "USD",
                "condition": "new",
                "quantity": 5,
            },
            format="json",
        )

        after_count = Product.objects.count()

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(after_count, before_count)

    def test_create_product_invalid_fields(self):
        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        before_count = Product.objects.count()

        response = self.client.post(
            self.products_url,
            {
                "name": "",
                "brand": "",
                "price": "-100",
                "currency": "AAA",
                "quantity": -1,
            },
            format="json",
        )

        after_count = Product.objects.count()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(after_count, before_count)

    def test_create_product_negative_price(self):
        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        before_count = Product.objects.count()

        response = self.client.post(
            self.products_url,
            {
                "name": "Test",
                "brand": "Test",
                "price": -10,
                "currency": "USD",
                "condition": "new",
                "quantity": 1,
            },
            format="json",
        )

        after_count = Product.objects.count()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(after_count, before_count)


class ProductUpdateTests(BaseProductTestCase):

    def test_owner_can_update(self):
        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        payload = {
            "name": "MacBook Pro",
            "brand": "Apple Updated",
            "description": "Updated laptop",
            "price": "2500.00",
            "currency": "EUR",
            "condition": "used",
            "quantity": 10,
        }

        response = self.client.patch(
            f"{self.products_url}{self.product.id}/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()

        self.assertEqual(self.product.name, payload["name"])
        self.assertEqual(self.product.brand, payload["brand"])
        self.assertEqual(self.product.description, payload["description"])
        self.assertEqual(str(self.product.price), payload["price"])
        self.assertEqual(self.product.currency, payload["currency"])
        self.assertEqual(self.product.condition, payload["condition"])
        self.assertEqual(self.product.quantity, payload["quantity"])

    def test_non_owner_cannot_update(self):
        self.login(
            "other@test.com",
            "StrongPass123",
        )

        response = self.client.patch(
            f"{self.products_url}{self.product.id}/",
            {
                "name": "Hack",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_product_without_login(self):
        response = self.client.patch(
            self.product_url,
            {
                "name": "Updated",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_buyer_cannot_update_product(self):
        self.login(
            "buyer@test.com",
            "StrongPass123",
        )

        response = self.client.patch(
            self.product_url,
            {
                "name": "Updated",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_update_product(self):
        self.login(
            "admin@test.com",
            "StrongPass123",
        )

        payload = {
            "name": "Updated Product",
            "brand": "Samsung",
            "description": "Updated description",
            "price": "1500.00",
            "currency": "EUR",
            "condition": "used",
            "quantity": 10,
        }

        response = self.client.patch(self.product_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.product.refresh_from_db()

        self.assertEqual(self.product.name, payload["name"])
        self.assertEqual(self.product.brand, payload["brand"])
        self.assertEqual(self.product.description, payload["description"])
        self.assertEqual(
            str(self.product.price),
            payload["price"],
        )
        self.assertEqual(self.product.currency, payload["currency"])
        self.assertEqual(self.product.condition, payload["condition"])
        self.assertEqual(self.product.quantity, payload["quantity"])

    def test_admin_can_delete_product(self):
        self.login(
            "admin@test.com",
            "StrongPass123",
        )

        product_id = self.product.id
        response = self.client.delete(self.product_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            Product.objects.filter(
                id=product_id,
            ).exists()
        )


class ProductMyTests(BaseProductTestCase):

    def setUp(self):
        super().setUp()

        Product.objects.create(
            seller=self.seller,
            name="MacBook",
            brand="Apple",
            price="2000.00",
            quantity=2,
        )

        Product.objects.create(
            seller=self.other_seller,
            name="Samsung",
            brand="Samsung",
            price="1500.00",
            quantity=3,
        )

    def test_my_products_as_seller(self):

        self.login(
            "seller@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.my_products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_my_products_as_second_seller(self):

        self.login(
            "other@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.my_products_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_my_products_as_buyer(self):

        self.login(
            "buyer@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.my_products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_my_products_as_admin(self):

        self.login(
            "admin@test.com",
            "StrongPass123",
        )

        response = self.client.get(self.my_products_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_my_products_without_login(self):

        response = self.client.get(self.my_products_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProductCategoryRelationTests(APITestCase):

    def setUp(self):
        self.seller_user = User.objects.create_user(
            email="seller@test.com",
            password="StrongPass123",
        )
        self.seller_user.seller = Seller.objects.create(
            user=self.seller_user,
            company_name="Test company",
            phone_number="+380501234567",
            address="Test address",
        )
        self.category1 = Category.objects.create(name="Engine-1")
        self.category2 = Category.objects.create(name="Engine-2")

    def test_create_product_with_category(self):
        self.client.force_authenticate(user=self.seller_user)
        category = Category.objects.create(name="Engine")
        payload = {
            "name": "Test product",
            "brand": "Test",
            "price": 100,
            "currency": "USD",
            "condition": "new",
            "quantity": 1,
            "category_ids": [category.id],
        }
        response = self.client.post("/api/products/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        product = Product.objects.get(id=response.data["id"])
        self.assertIn(category, product.category.all())

    def test_update_product_category(self):
        self.client.force_authenticate(user=self.seller_user)
        category1 = Category.objects.create(name="Engine")
        category2 = Category.objects.create(name="Brakes")
        product = Product.objects.create(
            name="Test product",
            brand="Test",
            price=100,
            currency="USD",
            condition="new",
            quantity=1,
            seller=self.seller_user.seller,
        )
        product.category.set([category1])
        url = f"/api/products/{product.id}/"
        response = self.client.patch(
            url,
            {"category_ids": [category2.id]},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertIn(category2, product.category.all())

    def test_product_contains_category_data(self):
        self.client.force_authenticate(user=self.seller_user)
        category = Category.objects.create(name="Engine")
        product = Product.objects.create(
            name="Test product",
            brand="Test",
            price=100,
            currency="USD",
            condition="new",
            quantity=1,
            seller=self.seller_user.seller,
        )
        product.category.set([category])
        url = f"/api/products/{product.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("category", response.data)
        self.assertEqual(len(response.data["category"]), 1)
        self.assertEqual(response.data["category"][0]["id"], category.id)
        self.assertEqual(response.data["category"][0]["name"], category.name)


class ProductImageTests(BaseProductTestCase):

    def test_owner_can_upload_images(self):
        self.login("seller@test.com", "StrongPass123")

        response = self.client.post(
            f"{self.products_url}{self.product.id}/images/",
            {"images": [self._make_image("one.jpg"), self._make_image("two.jpg")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(self.product.images.count(), 2)

    def test_upload_images_requires_files(self):
        self.login("seller@test.com", "StrongPass123")

        response = self.client.post(
            f"{self.products_url}{self.product.id}/images/",
            {},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_get_product_includes_images(self):
        ProductImage.objects.create(product=self.product, image=self._make_image())
        response = self.client.get(self.product_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["images"]), 1)
        self.assertIn("image", response.data["images"][0])

    def test_owner_can_delete_image(self):
        self.login("seller@test.com", "StrongPass123")
        image = ProductImage.objects.create(
            product=self.product,
            image=self._make_image(),
        )
        response = self.client.delete(
            f"{self.products_url}{self.product.id}/images/{image.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProductImage.objects.filter(id=image.id).exists())

    def test_non_owner_cannot_upload_images(self):
        self.login("other@test.com", "StrongPass123")

        response = self.client.post(
            f"{self.products_url}{self.product.id}/images/",
            {"images": [self._make_image()]},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_owner_cannot_delete_image(self):
        self.login("other@test.com", "StrongPass123")
        image = ProductImage.objects.create(
            product=self.product,
            image=self._make_image(),
        )
        response = self.client.delete(
            f"{self.products_url}{self.product.id}/images/{image.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(ProductImage.objects.filter(id=image.id).exists())

    def test_image_endpoints_require_authentication(self):
        image = ProductImage.objects.create(
            product=self.product,
            image=self._make_image(),
        )
        upload = self.client.post(
            f"{self.products_url}{self.product.id}/images/",
            {"images": [self._make_image()]},
            format="multipart",
        )
        delete = self.client.delete(
            f"{self.products_url}{self.product.id}/images/{image.id}/"
        )
        self.assertEqual(upload.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(delete.status_code, status.HTTP_401_UNAUTHORIZED)
