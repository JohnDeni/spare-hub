from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import User
from orders.models import Order, OrderDetail
from orders.serializers import OrderSerializer
from products.models import Product, ProductHistory
from products.services import create_product_history


class OrderTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            email="test@test.com",
            password="testpass123",
        )
        self.product = Product.objects.create(
            name="Test Product",
            brand="BMW",
            description="Test description",
            price=Decimal("100.00"),
            currency="USD",
            condition="new",
            quantity=10,
        )
        create_product_history(self.product)
        response = self.client.post(
            "/api/auth/token/",
            {
                "email": "test@test.com",
                "password": "testpass123",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.token = response.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_create_order(self):
        response = self.client.post(
            "/api/orders/",
            {
                "status": "pending",
                "details": [
                    {
                        "product": self.product.id,
                        "quantity": 2,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get()
        self.assertEqual(order.user, self.user)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.details.count(), 1)
        detail = order.details.first()
        self.assertEqual(detail.quantity, 2)
        self.assertEqual(detail.product_history.product, self.product)
        self.assertEqual(detail.product_history.price, self.product.price)

    def test_get_orders(self):
        order = Order.objects.create(user=self.user)
        history = ProductHistory.objects.filter(product=self.product).latest(
            "created_at"
        )
        OrderDetail.objects.create(
            order=order,
            product_history=history,
            quantity=2,
        )
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected = OrderSerializer(Order.objects.filter(user=self.user), many=True).data
        self.assertEqual(response.data["results"], expected)

    def test_get_single_order(self):
        order = Order.objects.create(user=self.user)
        history = ProductHistory.objects.filter(product=self.product).latest(
            "created_at"
        )
        OrderDetail.objects.create(
            order=order,
            product_history=history,
            quantity=2,
        )
        response = self.client.get(f"/api/orders/{order.id}/")
        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["id"], order.id)
        self.assertEqual(len(response.data["details"]), 1)
        self.assertEqual(
            response.data["details"][0]["product_history"]["name"], self.product.name
        )

    def test_user_cannot_see_other_users_orders(self):
        other_user = User.objects.create_user(
            email="other@test.com",
            password="testpass123",
        )
        Order.objects.create(user=other_user)
        Order.objects.create(user=self.user)
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["user"], self.user.id)

    def test_update_order(self):
        order = Order.objects.create(user=self.user, status="pending")
        history = ProductHistory.objects.filter(product=self.product).latest(
            "created_at"
        )
        OrderDetail.objects.create(
            order=order,
            product_history=history,
            quantity=2,
        )
        new_product = Product.objects.create(
            name="New Product",
            brand="Audi",
            description="New description",
            price="50.00",
            currency="USD",
            condition="new",
            quantity=5,
        )
        create_product_history(new_product)
        response = self.client.patch(
            f"/api/orders/{order.id}/",
            {
                "status": "paid",
                "details": [
                    {
                        "product": new_product.id,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.details.count(), 1)
        detail = order.details.first()
        self.assertEqual(detail.quantity, 1)
        self.assertEqual(detail.product_history.product, new_product)

    def test_delete_order(self):
        order = Order.objects.create(user=self.user)
        history = ProductHistory.objects.filter(product=self.product).latest(
            "created_at"
        )
        OrderDetail.objects.create(
            order=order,
            product_history=history,
            quantity=2,
        )
        response = self.client.delete(f"/api/orders/{order.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Order.objects.filter(id=order.id).exists())

    def test_create_order_without_details(self):
        response = self.client.post(
            "/api/orders/",
            {
                "status": "pending",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("details", response.data)

    def test_create_order_with_invalid_product(self):
        response = self.client.post(
            "/api/orders/",
            {
                "status": "pending",
                "details": [
                    {
                        "product": 9999,
                        "quantity": 1,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_keeps_product_history_after_product_update(self):
        response = self.client.post(
            "/api/orders/",
            {
                "status": "pending",
                "details": [
                    {
                        "product": self.product.id,
                        "quantity": 2,
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.name = "Updated Product"
        self.product.price = "500.00"
        self.product.save()
        create_product_history(self.product)
        response = self.client.get(f"/api/orders/{response.data['id']}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = response.data["details"][0]["product_history"]
        self.assertEqual(history["name"], "Test Product")
        self.assertEqual(history["price"], "100.00")

    def test_orders_require_authentication(self):
        self.client.credentials()
        order = Order.objects.create(user=self.user)

        for method, url, data in [
            ("get", "/api/orders/", None),
            (
                "post",
                "/api/orders/",
                {
                    "status": "pending",
                    "details": [{"product": self.product.id, "quantity": 1}],
                },
            ),
            ("patch", f"/api/orders/{order.id}/", {"status": "paid"}),
            ("delete", f"/api/orders/{order.id}/", None),
        ]:
            response = (
                getattr(self.client, method)(url, data, format="json")
                if data
                else getattr(self.client, method)(url)
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                msg=f"{method.upper()} {url}",
            )

    def test_user_cannot_retrieve_other_users_order(self):
        other_user = User.objects.create_user(
            email="other@test.com", password="testpass123"
        )
        other_order = Order.objects.create(user=other_user)
        response = self.client.get(f"/api/orders/{other_order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_update_other_users_order(self):
        other_user = User.objects.create_user(
            email="other@test.com", password="testpass123"
        )
        other_order = Order.objects.create(user=other_user)
        response = self.client.patch(
            f"/api/orders/{other_order.id}/", {"status": "paid"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_delete_other_users_order(self):
        other_user = User.objects.create_user(
            email="other@test.com", password="testpass123"
        )
        other_order = Order.objects.create(user=other_user)
        response = self.client.delete(f"/api/orders/{other_order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_order_with_invalid_quantity(self):
        for quantity in [0, -1]:
            with self.subTest(quantity=quantity):
                response = self.client.post(
                    "/api/orders/",
                    {
                        "status": "pending",
                        "details": [{"product": self.product.id, "quantity": quantity}],
                    },
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_order_status_only_keeps_details(self):
        order = Order.objects.create(user=self.user, status="pending")
        history = ProductHistory.objects.filter(product=self.product).latest(
            "created_at"
        )
        OrderDetail.objects.create(order=order, product_history=history, quantity=2)

        response = self.client.patch(
            f"/api/orders/{order.id}/", {"status": "paid"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.details.count(), 1)
        self.assertEqual(order.details.first().quantity, 2)
