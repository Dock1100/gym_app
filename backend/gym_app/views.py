import hashlib
import io
import json
from typing import Optional

import pytube
import whisper
from asgiref.sync import sync_to_async
from django.core.files import File
from django.shortcuts import render
from django.http import HttpResponse
import numpy as np
import torch
import pytube
import openai
import demjson
from demjson import decode


import json

from whisper import Whisper

from gym_app.models import Video, TextToExercisesResult

MODEL: Optional[Whisper] = None

openai.api_key = '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'

TEXT_TO_EXERCISES_PROMPT_TEMPLATE = """Respond in JSON format.
For provided text list how many exercises there are.
For each exercise write:
exercise name under key "name";
short summary under key "summary";
location in the text where current exercise starts under the key "exercise_text_location", as a character number;
what are primary affected muscle groups, as list, under key "primary_muscle_groups";
what are secondary affected muscle groups, as list, under key "secondary_muscle_groups";
possible muscle groups are "neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings";
what you should pay attention to, things to focus on, as list, under key "attention_to";
what is the start position of the body, under key "start_position", along with location in the text, as character number under key "start_position_text_location";
what are the moves of the exercises, as list, under key "moves"; 
for each move list location in the text as a character number, under key "moves_text_locations";
what is the required equipment if there is any, as list, under key "equipment";
is it pushing or pulling movement under key "movement_type";
is it stretching exercise under key "is_stretching".

The text is below:
{}"""


def gpt3complete(prompt):
    print('calling openai')
    completion_tokens = 1500
    max_prompt_length = 4096
    prompt = prompt[0:(max_prompt_length-completion_tokens)*4]
    prompt_2 = prompt[0:prompt.rfind('.')+1]
    if prompt_2:
        prompt = prompt_2
    # len(prompt) = 17720; => 4097 tokens, however you requested 4403 tokens (4003 in your prompt; 400 for the completion)
    Platformresponse = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        temperature=0.7,
        max_tokens=completion_tokens,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        )

    return Platformresponse


def load_model():
    global MODEL
    if MODEL is None:
        if torch.cuda.is_available():
            DEVICE = "cuda"
        # elif torch.backends.mps.is_available():
        #     DEVICE = "mps"
        else:
            DEVICE = "cpu"
        MODEL = whisper.load_model("base", device=DEVICE)
        # available models https://github.com/openai/whisper/blob/main/model-card.md
        print(
            f"Model is {'multilingual' if MODEL.is_multilingual else 'English-only'} "
            f"and has {sum(np.prod(p.shape) for p in MODEL.parameters()):,} parameters."
        )


def transcribe_file(file: File) -> dict:
    load_model()
    print('transcripting file', file.file.name)
    transcript = MODEL.transcribe(file.file.name)
    print('\tdone')
    return transcript


async def parse_video_by_url(request):
    data = json.loads(request.body)
    video_url = data.get('videoUrl')
    if not video_url:
        return HttpResponse('no video_url', status=400)
    try:
        video = await Video.objects.aget(url=video_url)
    except Video.DoesNotExist:
        video = Video(url=video_url)
        await sync_to_async(video.save)()

    if not video.file:
        print('downloading video/audio stream')
        data = pytube.YouTube(video.url)
        # Converting and downloading as 'MP4' file
        audio = data.streams.get_audio_only()
        print('\t downloaded')
        buffer = io.BytesIO()
        audio.stream_to_buffer(buffer)
        buffer.seek(0)
        video.file = File(buffer, name=audio.default_filename)
        await sync_to_async(video.save)()
        print('\t saved')

    if not video.transcript_json or not video.transcript_text:
        print('transcribing')
        transcript = await sync_to_async(transcribe_file)(video.file)
        video.transcript_json = transcript
        video.transcript_text = transcript['text']
        await sync_to_async(video.save)()

    try:
        text_to_exercises = await TextToExercisesResult.objects.aget(
            transcript_text=video.transcript_text,
            openapi_prompt_template=TEXT_TO_EXERCISES_PROMPT_TEMPLATE
        )
    except TextToExercisesResult.DoesNotExist:
        openapi_prompt = TEXT_TO_EXERCISES_PROMPT_TEMPLATE.format(video.transcript_text)
        openapi_response = await sync_to_async(gpt3complete)(openapi_prompt)
        text_to_exercises = TextToExercisesResult(
            transcript_text=video.transcript_text,
            openapi_prompt_template=TEXT_TO_EXERCISES_PROMPT_TEMPLATE,
            openapi_response=json.loads(json.dumps(openapi_response))
        )
        await sync_to_async(text_to_exercises.save)()

    # text_to_exercises.openapi_response['choices'][0]['text']
    if not text_to_exercises.exercises or not text_to_exercises.succeed_to_parse:
        text_to_parse = text_to_exercises.openapi_response['choices'][0]['text']
        try:
            start = min(max(0, text_to_parse.find('{')), max(0, text_to_parse.find('}')))
            end = text_to_parse.rfind('}')+1
            if end <= 0:
                end = len(text_to_parse)
            trimmed: str = text_to_parse[start:end]
            if trimmed.startswith('{'):
                trimmed = '[' + trimmed
            if trimmed.endswith('}'):
                trimmed = trimmed + ']'
            exercises_raw = demjson.decode(trimmed)
            if not isinstance(exercises_raw, list):
                if 'exercises' in exercises_raw:
                    exercises_raw = exercises_raw['exercises']
                else:
                    exercises_raw = [exercises_raw]
            else:
                if len(exercises_raw) > 0:
                    if 'exercises' in exercises_raw[0]:
                        exercises_raw = exercises_raw[0]['exercises']
            exercises = []
            for exercise_raw in exercises_raw:
                ex = {}
                ex['name'] = exercise_raw['name']
                ex['summary'] = exercise_raw['summary']
                ex['text_location'] = int(exercise_raw['exercise_text_location'])
                ex['primary_muscle_groups'] = exercise_raw['primary_muscle_groups']
                ex['secondary_muscle_groups'] = exercise_raw['secondary_muscle_groups']
                ex['attention_to'] = exercise_raw['attention_to']
                ex['movement_type'] = exercise_raw['movement_type']
                ex['is_stretching'] = exercise_raw['is_stretching']
                ex['start_position'] = {
                    'text': exercise_raw['start_position'],
                    'text_location': int(exercise_raw['start_position_text_location']),
                }
                equipment = exercise_raw['equipment']
                if (not equipment
                    or (isinstance(equipment, str) and equipment.lower() in ('none', 'no'))
                    ):
                    equipment = None
                ex['equipment'] = equipment
                steps_raw = exercise_raw['moves']
                steps = []
                if steps_raw:
                    if isinstance(steps_raw[0], str):
                        if "moves_text_locations" not in exercise_raw:
                            raise ValueError("moves_text_locations not found")
                        if len(exercise_raw["moves_text_locations"]) != len(steps_raw):
                            raise ValueError("moves_text_locations length mismatch")
                        for i in range(len(steps_raw)):
                            steps.append({
                                'text': steps_raw[i],
                                'text_location': int(exercise_raw['moves_text_locations'][i]),
                            })
                    else:
                        if len(steps_raw[0]) != 2:
                            raise ValueError("steps_raw do not contain exactly 2 keys")
                        for step_raw in steps_raw:
                            steps.append({
                                'text': step_raw[next(k for k in step_raw.keys() if k != 'step_text_location')],
                                'text_location': step_raw['step_text_location'],
                            })
                    ex['steps'] = steps
                else:
                    raise ValueError('no steps')

                exercises.append(ex)

            text_to_exercises.succeed_to_parse = True
            text_to_exercises.exercises = exercises
            await sync_to_async(text_to_exercises.save)()
        except Exception as e:
            text_to_exercises.succeed_to_parse = False
            await sync_to_async(text_to_exercises.save)()

    return HttpResponse(json.dumps({
        'succeed_to_parse': text_to_exercises.succeed_to_parse,
        'exercises': text_to_exercises.exercises,
    }), status=200)


def upload_and_parse_training_log(request):
    a = 2
    return HttpResponse(json.dumps({
        'msg': 'ok',
    }), status=200)
