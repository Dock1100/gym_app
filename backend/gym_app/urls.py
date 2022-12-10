from django.urls import path

from . import views

urlpatterns = [
    path('parse_video_by_url', views.parse_video_by_url),
]
