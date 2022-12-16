import io
import json
import re
from typing import Optional

import demjson
import numpy as np
import openai
import pytube
import torch
import whisper
from django.core.files import File
from whisper import Whisper

from config.settings import OPENAI_KEY
from gym_app.models import Video, TextToExercisesResult, TrainingLog, TextToTrainingLog

MODEL: Optional[Whisper] = None

openai.api_key = OPENAI_KEY


# current best
# TEXT_TO_EXERCISES_PROMPT_TEMPLATE = """Respond in JSON format.
# For provided text list how many exercises there are.
# What is last character location, as character number, under key "end_text_location".
# For each exercise write:
# exercise name under key "name";
# short summary under key "summary";
# location in the text where current exercise starts, as character number, under the key "exercise_text_location";
# what are primary affected muscle groups, as list, under key "primary_muscle_groups";
# what are secondary affected muscle groups, as list, under key "secondary_muscle_groups";
# possible muscle groups are "neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings";
# what you should pay attention to, things to focus on, as list, under key "attention_to";
# what is the start position of the body, under key "start_position", along with location in the text, as character number under key "start_position_text_location";
# what are the moves of the exercises, as list, under key "moves";
# for each move list location in the text as a character number, under key "moves_text_locations";
# is it pushing or pulling movement under key "movement_type".
#
# #The text starts here:
# {}
# #The text ends here."""

TEXT_TO_EXERCISES_PROMPT_TEMPLATE = """Respond in JSON format.
For provided text list how many exercises there are.
What is last character location, as character number, under key "end_text_location".
For each exercise write:
exercise name under key "name";
location in the text where current exercise starts, as character number, under the key "exercise_text_location";
short summary under key "summary";
is it pushing or pulling movement under key "movement_type";
what are primary affected muscle groups, as list, under key "primary_muscle_groups";
what are secondary affected muscle groups, as list, under key "secondary_muscle_groups";
possible muscle groups are "neck", "chest", "shoulders", "biceps", "forearms", "abs", "thighs", "calves", "back", "triceps", "glutes", "hamstrings";
what is the start position/pose of the body, under key "start_position", along with location in the text, as character number under key "start_position_text_location";
what are the moves of current exercise, as list, under key "moves";
for each move list location in the text as a character number, under key "moves_text_locations".


#The text starts here:
{}
#The text ends here."""

TEXT_TO_TRAINING_LOG_PROMPT_TEMPLATE = """Respond in JSON format.
I have a text recording of my exercises session.
Get number of repeats I have made, as number, under key "repeats";
Get lifted/used weight, as number, under key "weight";
Suggest if I can do one more exercise, as boolean, under key "can_do_one_more_repeat";
Suggest how I feel, as string, under key "feel";
"feel" must be "energetic", "ok", "exhausted", "bad";
Did I have some pain like back, joint, side or muscle pain, as string, under key "pain";
Did I have burning muscles, as boolean, under key "burning_muscles";
Did my I joints clicked or cracked, as boolean, under key "clicks_in_joints";
Suggest if I was hard breathing, as boolean, under key "hard_breathing";
Suggest if I was missing air or had suffocation, as boolean, under key "no_air";
Suggest if I had dizziness, vertigo, giddiness, as boolean, under key "dizziness";

In case "feel" is "bad" or "exhausted", or in case there is some harm - suggest tips about repeats and weight, under key "tips";
In case "feel" is "energetic", "ok", "exhausted" and not "can_do_one_more_repeat" - suggest tips which may encourage me, under key "encourage";

The text recording is noisy and with lots of misspellings, it is below:
{}"""


def gpt3complete(template, full_text):
    print('calling openai')
    completion_tokens = 1500
    max_prompt_length = 4096
    # len(prompt) = 17720; failed with error: max is 4097 tokens, however you requested 4403 tokens (4003 in your prompt; 400 for the completion)
    # len(prompt) = 17968 => This model's maximum context length is 4097 tokens, however you requested 4854 tokens (3354 in your prompt; 1500 for the completion). Please reduce your prompt; or completion length.
    # 12327; 4097 tokens, however you requested 4298 tokens (2798 in your prompt; 1500 for the completion)
    avg_token_length = 4
    # text = '> %s\n>' % ('\n>'.join(re.split(r'[.?!]', full_text)),)
    text = full_text
    if len(text) + len(template) > (max_prompt_length - completion_tokens) * avg_token_length:
        text = text[0:round((max_prompt_length - completion_tokens) * avg_token_length - len(template))]
        # text = text[0:max(text.rfind('.') + 1, text.rfind('>') + 1)]
        text = text[0:max(text.rfind('.') + 1, text.rfind('!') + 1, text.rfind('?') + 1)]
    prompt = template.format(text)
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


def extract_json(text: str, as_list=False) -> dict:
    start = min(max(0, text.find('{')), max(0, text.find('}')))
    end = text.rfind('}') + 1
    if end <= 0:
        end = len(text)
    trimmed: str = text[start:end]
    if trimmed.startswith('{') and as_list:
        trimmed = '[' + trimmed
    if trimmed.endswith('}') and as_list:
        trimmed = trimmed + ']'
    return demjson.decode(trimmed)


def process_video_to_exercises(video: Video) -> TextToExercisesResult:
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
        video.save()
        print('\t saved')

    if not video.duration_s:
        data = pytube.YouTube(video.url)
        video.title = data.title
        video.duration_s = data.length
        video.save()

    # todo: grab video subtitles if possible

    if not video.transcript_json or not video.transcript_text:
        print('transcribing')
        transcript = transcribe_file(video.file)
        video.transcript_json = transcript
        video.transcript_text = transcript['text']
        video.save()

    text_to_exercises = TextToExercisesResult.objects.filter(
            transcript_text=video.transcript_text,
            openapi_prompt_template=TEXT_TO_EXERCISES_PROMPT_TEMPLATE
    ).first()
    if not text_to_exercises:
        openapi_response = gpt3complete(TEXT_TO_EXERCISES_PROMPT_TEMPLATE, video.transcript_text)
        text_to_exercises = TextToExercisesResult(
            transcript_text=video.transcript_text,
            openapi_prompt_template=TEXT_TO_EXERCISES_PROMPT_TEMPLATE,
            openapi_response=json.loads(json.dumps(openapi_response))
        )
        text_to_exercises.save()

    # text_to_exercises.openapi_response['choices'][0]['text']
    if True or not text_to_exercises.exercises or not text_to_exercises.succeed_to_parse:
        text_to_parse = text_to_exercises.openapi_response['choices'][0]['text']
        try:
            json_raw = extract_json(text_to_parse, as_list=True)
            if len(json_raw) == 1:
                json_raw = json_raw[0]
                text_to_exercises.transcript_length_in_token = json_raw.get('end_text_location')
            else:
                text_to_exercises.transcript_length_in_token = None  # model respond with cropped text
            for key in json_raw.keys():
                if isinstance(json_raw[key], list):
                    exercises_raw = json_raw[key]
                    break
            else:
                exercises_raw = json_raw

            exercises = []
            for exercise_raw in exercises_raw:
                ex = {}
                ex['name'] = exercise_raw['name']
                ex['summary'] = exercise_raw['summary']
                ex['text_location'] = int(exercise_raw['exercise_text_location'])
                ex['primary_muscle_groups'] = exercise_raw['primary_muscle_groups']
                ex['secondary_muscle_groups'] = exercise_raw['secondary_muscle_groups']
                ex['movement_type'] = exercise_raw['movement_type']
                ex['start_position'] = {
                    'text': exercise_raw['start_position'],
                    'text_location': int(exercise_raw['start_position_text_location']),
                }
                steps_raw = exercise_raw['moves']
                steps = []
                if steps_raw:
                    if isinstance(steps_raw[0], str):
                        if "moves_text_locations" not in exercise_raw:
                            raise ValueError("moves_text_locations not found")
                        if len(exercise_raw["moves_text_locations"]) != len(steps_raw):
                            steps = []
                            # raise ValueError("moves_text_locations length mismatch")
                        else:
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
            text_to_exercises.save()
        except Exception as e:
            text_to_exercises.succeed_to_parse = False
            text_to_exercises.save()

    # text_position to timecode
    if text_to_exercises.succeed_to_parse \
            and len(text_to_exercises.exercises) > 0\
            and text_to_exercises.exercises[-1].get('timecode') is None:
        # transcript_length_in_token =
        loc__time = []
        first_char_loc = 0
        for segment in video.transcript_json['segments']:
            loc__time.append({
                'char_start': first_char_loc,
                'char_end': first_char_loc + len(segment['text']),
                'length': len(segment['text']),
                'time_start': segment['start'],
                'time_end': segment['end'],
                'duration': segment['end'] - segment['start'],
            })
            first_char_loc += len(segment['text'])

        def get_timecode(token_location):
            length_in_tokens = text_to_exercises.transcript_length_in_token or len(text_to_exercises.transcript_text)/4.3
            char_location = len(text_to_exercises.transcript_text) * (
                    token_location / length_in_tokens)
            for loc in loc__time:
                if loc['char_start'] <= char_location < loc['char_end']:
                    return loc['time_start'] + (char_location - loc['char_start']) / loc['length'] * loc['duration']
            return None

        for exercise in text_to_exercises.exercises:
            exercise['timecode'] = get_timecode(exercise['text_location'])
            if not exercise['timecode']:
                pass
            ex_start_pos = exercise['start_position']
            ex_start_pos['timecode'] = get_timecode(ex_start_pos['text_location'])
            if not exercise['start_position']['timecode']:
                pass
                # raise ValueError('start_position timecode not found')
            for step in exercise['steps']:
                step['timecode'] = get_timecode(step['text_location'])
                if not step['timecode']:
                    pass
                    # raise ValueError('step timecode not found')

    return text_to_exercises


def parse_gpt_training_log(text_to_parse: str) -> dict:
    log_raw = extract_json(text_to_parse, as_list=False)
    log = {}
    log['repeats'] = int(log_raw['repeats']) if str(log_raw.get('repeats', '')).isdecimal() else 10
    log['weight'] = int(log_raw['weight']) if str(log_raw.get('weight', '')).isdecimal() else 5
    log['able_to_do_more'] = log_raw['can_do_one_more_repeat']
    log['feel'] = log_raw['feel']  # "bad", "exhausted", "ok", "energetic"
    harm = set()  # "no_air", "dizzy", "joint", "burn"
    # todo: differentiate "joint_clicks" and "joint_pain",
    pain = log_raw['pain'].replace('pain', '').strip()
    if (not pain
            or (isinstance(pain, str) and pain.lower() in ('none', 'no'))
            or (isinstance(pain, list) and len(pain) == 1 and pain[0].lower() in ('none', 'no'))
    ):
        pain = None
    if pain and 'muscle' not in pain:
        harm.add('joint')
    if log_raw['clicks_in_joints']:
        harm.add('joint')
    if log_raw['hard_breathing']:
        pass
    if log_raw['dizziness']:
        harm.add('dizzy')
    if log_raw['burning_muscles']:
        harm.add('burn')
    if log_raw['no_air']:
        harm.add('no_air')

    log['harm'] = list(harm)
    tips = log_raw.get('tips')
    if (not tips
            or (isinstance(tips, str) and tips.lower() in ('none', 'no'))
            or (isinstance(tips, list) and len(tips) == 1 and tips[0].lower() in ('none', 'no'))
    ):
        tips = None
    log['tips'] = tips

    encourage = log_raw.get('encourage')
    if not tips:
        if (not encourage
                or (isinstance(encourage, str) and encourage.lower() in ('none', 'no'))
                or (isinstance(encourage, list) and len(encourage) == 1 and encourage[0].lower() in ('none', 'no'))
        ):
            encourage = None
        log['tips'] = encourage
    return log


def process_rec_to_training_log(rec: TrainingLog) -> TextToTrainingLog:
    if not rec.transcript_json:
        print('transcribing')
        transcript = transcribe_file(rec.file)
        rec.transcript_json = transcript
        rec.transcript_text = transcript['text']
        rec.save()

    text_to_training_log = TextToTrainingLog.objects.filter(
            transcript_text=rec.transcript_text,
            openapi_prompt_template=TEXT_TO_TRAINING_LOG_PROMPT_TEMPLATE
    ).first()
    if not text_to_training_log:
        openapi_response = gpt3complete(TEXT_TO_TRAINING_LOG_PROMPT_TEMPLATE, rec.transcript_text)
        text_to_training_log = TextToTrainingLog(
            transcript_text=rec.transcript_text,
            openapi_prompt_template=TEXT_TO_TRAINING_LOG_PROMPT_TEMPLATE,
            openapi_response=json.loads(json.dumps(openapi_response))
        )
        text_to_training_log.save()

    if not text_to_training_log.training_log or not text_to_training_log.succeed_to_parse:
        text_to_parse = text_to_training_log.openapi_response['choices'][0]['text']
        try:
            log = parse_gpt_training_log(text_to_parse)
            text_to_training_log.succeed_to_parse = True
            text_to_training_log.training_log = log
            text_to_training_log.save()
        except Exception as e:
            text_to_training_log.succeed_to_parse = False
            text_to_training_log.save()

    return text_to_training_log
