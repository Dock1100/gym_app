from django.contrib.postgres.fields import ArrayField
from django.db import models
from typing import List, Optional

from django.forms import JSONField




class ExerciseInfo(models.Model):
    name = models.CharField(max_length=128)
    summary = models.CharField(max_length=256)
    primary_muscle_groups = ArrayField(models.CharField(max_length=128))
    secondary_muscle_groups = ArrayField(models.CharField(max_length=128))
    attention_to = JSONField()
    equipment = ArrayField(models.CharField(max_length=128))
    movement_type = models.CharField(max_length=128)
    steps = JSONField()


class AttentionToItem:
    item: str
    text_position: int
    timecode_ms: int

class StepItem:
    short_name: str
    description: str
    text_position: int
    timecode_ms: int



class ParsedExerciseInfo(ExerciseInfo):
    text_position: int
    timecode_ms: int
    pass


class Video:
    url: str
    name: str
    duration_ms: int
    transcript: dict
    transcript_text: str
    prompt: dict
    prompt_response: dict
    parsing_error: Optional[str]
    parsed_exercises: List[ParsedExerciseInfo]

    is_transcripted: bool
    is_parsed: bool


class MyExercise(ExerciseInfo):
    based_on_id: Optional[ParsedExerciseInfo]
    is_edited: bool

