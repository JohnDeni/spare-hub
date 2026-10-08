from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Seller, User, UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "id"]


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = UserProfile
        fields = ["id", "first_name", "last_name", "role", "user"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        request_user = self.context["request"].user
        user_data = validated_data.pop("user")
        role = validated_data.get("role")

        if role == "admin" and not request_user.is_superuser:
            raise serializers.ValidationError(
                "You do not have the rights to create an admin"
            )

        user = User.objects.create(**user_data)
        validated_data["user_id"] = user.id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request_user = self.context["request"].user
        user_data = validated_data.pop("user", None)
        role = validated_data.get("role", instance.role)

        if role == "admin" and not request_user.is_superuser:
            raise serializers.ValidationError(
                "You do not have permission to assign admin role"
            )

        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()

        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.role = role
        instance.save()

        if role == "seller":
            Seller.objects.get_or_create(
                user=instance.user,
                defaults={"phone_number": instance.phone_number},
            )

        return instance


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate(self, attrs):
        self.token = attrs["refresh"]
        return attrs

    def save(self, **kwargs):
        try:
            token = RefreshToken(self.token)
            token.blacklist()

        except Exception:
            raise serializers.ValidationError(
                {"refresh": "Invalid refresh token"}
            ) from None


class RegisterSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    phone_number = serializers.CharField(write_only=True)
    role = serializers.CharField(write_only=True)

    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "first_name",
            "last_name",
            "phone_number",
            "role",
        ]

    def create(self, validated_data):
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        phone_number = validated_data.pop("phone_number")
        role = validated_data.pop("role")

        password = validated_data.pop("password")

        user = User.objects.create(**validated_data)

        user.set_password(password)
        user.save()

        UserProfile.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role=role,
        )

        if role == "seller":
            Seller.objects.create(
                user=user,
                phone_number=phone_number,
            )

        return user


class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        fields = [
            "id",
            "company_name",
            "address",
            "phone_number",
        ]
