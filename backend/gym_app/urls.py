from django.urls import path

from . import views

urlpatterns = [
    path('parse_video_by_url', views.parse_video_by_url),
    path('upload_and_parse_training_log', views.upload_and_parse_training_log),
    path('reprocess_all_audio', views.reprocess_all_audio),
    path('reprocess_all_videos', views.reprocess_all_videos),
    path('register', views.register),
]
