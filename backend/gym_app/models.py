from django.contrib.postgres.fields import ArrayField
from django.db import models
from typing import List, Optional



class Video(models.Model):
    url = models.CharField(max_length=256, unique=True, db_index=True, primary_key=True)
    file = models.FileField(upload_to='videos/', null=True)
    transcript_json = models.JSONField(null=True)
    transcript_text = models.TextField(null=True)


class TextToExercisesResult(models.Model):
    transcript_text = models.TextField()
    openapi_prompt_template = models.TextField()
    openapi_response = models.JSONField()
    succeed_to_parse = models.BooleanField(null=True)
    exercises = models.JSONField(null=True)


class TrainingLog(models.Model):
    id = models.AutoField(primary_key=True)
    key = models.CharField(max_length=256, db_index=True, null=True)
    date = models.DateField(auto_now_add=True)
    file = models.FileField(upload_to='training_logs/')
    transcript_text = models.TextField(null=True)
    transcript_json = models.JSONField(null=True)


class TextToTrainingLog(models.Model):
    transcript_text = models.TextField()
    openapi_prompt_template = models.TextField()
    openapi_response = models.JSONField()
    succeed_to_parse = models.BooleanField(null=True)
    training_log = models.JSONField(null=True)


# class Video:
#     url = models.CharField(max_length=256, unique=True, db_index=True)
#     name = models.CharField(max_length=256, unique=True, db_index=True)
#     # duration_ms: int
#     transcript: dict
#     transcript_text: str
#     prompt: dict
#     prompt_response: dict
#     parsing_error: Optional[str]
#     parsed_exercises: List[dict]
#
#     is_downloaded: bool
#     is_transcripted: bool
#     is_parsed: bool

#
#
#
#
# class ExerciseInfo(models.Model):
#     name = models.CharField(max_length=128)
#     summary = models.CharField(max_length=256)
#     primary_muscle_groups = ArrayField(models.CharField(max_length=128))
#     secondary_muscle_groups = ArrayField(models.CharField(max_length=128))
#     attention_to = JSONField()
#     equipment = ArrayField(models.CharField(max_length=128))
#     movement_type = models.CharField(max_length=128)
#     steps = JSONField()
#
#
# class AttentionToItem:
#     item: str
#     text_position: int
#     timecode_ms: int
#
# class StepItem:
#     short_name: str
#     description: str
#     text_position: int
#     timecode_ms: int
#
#
#
# class ParsedExerciseInfo(ExerciseInfo):
#     text_position: int
#     timecode_ms: int
#     pass
#
#
#
#
#
# class MyExercise(ExerciseInfo):
#     based_on_id: Optional[ParsedExerciseInfo]
#     is_edited: bool

