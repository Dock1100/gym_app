from django.contrib import admin

# Register your models here.
from gym_app.models import Video, TextToExercisesResult, TrainingLog, TextToTrainingLog, Subscriber


def get_fields(model):
    return sorted([field.name for field in
                    model._meta.get_fields()])

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['url', 'file']


@admin.register(TextToExercisesResult)
class TextToExercisesResultAdmin(admin.ModelAdmin):
    list_display = get_fields(TextToExercisesResult)


@admin.register(TrainingLog)
class TrainingLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'key', 'transcript_text', 'file', 'date']


@admin.register(TextToTrainingLog)
class TextToTrainingLogAdmin(admin.ModelAdmin):
    list_display = ['transcript_text', 'training_log']


@admin.register(Subscriber)
class SubscriberAdmin(admin.ModelAdmin):
    list_display = ['date_created', 'email', 'is_subscriber', 'is_or_subscriber', 'login_nums', 'date_last_login']
