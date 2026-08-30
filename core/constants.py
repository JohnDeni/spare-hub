# DRF's @action decorator only routes the parent object's pk by default, so
# nested "delete one image by id" actions need an explicit regex segment to
# capture the image id. Shared so products/orders/feedback stay consistent.
IMAGE_DETAIL_URL_PATH = r"images/(?P<image_id>\d+)"
