from django.contrib import admin

from feedback.models import Review, ReviewImage, ReviewReply

admin.site.register(Review)
admin.site.register(ReviewReply)
admin.site.register(ReviewImage)
