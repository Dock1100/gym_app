from django.contrib import admin

# Register your models here.
from gym_app.models import Video, TextToExercisesResult


def get_fields(model):
    return sorted([field.name for field in
                    model._meta.get_fields()])

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['url', 'file']


@admin.register(TextToExercisesResult)
class TextToExercisesResultAdmin(admin.ModelAdmin):
    list_display = get_fields(TextToExercisesResult)