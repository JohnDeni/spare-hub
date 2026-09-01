from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsReviewOwner(BasePermission):

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.user.is_superuser:
            return True

        return obj.user_id == request.user.id
