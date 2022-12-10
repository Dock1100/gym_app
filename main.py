import whisper
import os
import numpy as np
import torch
import pytube
import openai
import json

OPEN_AI_API_KEY = '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'
openai.api_key = OPEN_AI_API_KEY


def gpt3complete(speech):
    # Completion function call engine: text-davinci-002
    print('calling openai')
    # looks like the cheapes and working query
    # prompt='For provided text list how many exercises there are. '
    #                'For each exercise write: '
    #                'exercise name; '
    #                'short summary; '
    #                'which muscle groups are affected, as list; '
    #                'what are the steps, as list; '
    #                'what should pay attention to, as list; '
    #                'what is required equipment if there is any, as list; '
    #                'is it pushing or pulling movement. '
    #                'Do it in the JSON format. '
    #                'The text is "{}"'.format(speech),

    # fine structure
    #         prompt="""Answer in the JSON format.
    # For provided text list how many exercises there are.
    # For each exercise write:
    # exercise name under key "name";
    # short summary under key "summary";
    # what are primary affected muscle groups, as list under key "primary_muscle_groups";
    # what are secondary affected muscle groups, as list under key "secondary_muscle_groups";
    # what should pay attention to, as list under key "attention_to";
    # what is required equipment if there is any, as list under key "equipment";
    # is it pushing or pulling movement under key "movement_type";
    # what are the steps, as list, under key "steps".
    # The text is "{}""".format(speech),

    # this one provides best answer (steps and attention_to parts), but structure may very between responses
    # For provided text list how many exercises there are. For each exercise write: exercise name; short summary; which muscle groups are affected, as list; what are the steps, as list; what should pay attention to, as list; what is required equipment if there is any, as list; is it pushing or pulling movement. Do it in the JSON format. The text is “<youtube video transcription>”
    Platformresponse = openai.Completion.create(
        engine="text-davinci-003",
        prompt="""Answer in the JSON format.
For provided text list how many exercises there are.
For each exercise write:
exercise name under key "name";
short summary under key "summary";
position in text where it starts under key "text_position", as  character number;
what are primary affected muscle groups, as list under key "primary_muscle_groups";
what are secondary affected muscle groups, as list under key "secondary_muscle_groups";
what you should pay attention to do it right and safe, as list under key "attention_to";
"attention_to" along with it's "item" should also include their position in text where it is described, as character number;
what is required equipment if there is any, as list under key "equipment";
is it pushing or pulling movement under key "movement_type";
what are the steps, as list, under key "steps";
each step describes physical movement; 
"steps" along with it's "description" and "short_name" should also include their position in text where it starts, as character number under key "text_position".
The text is "{}""".format(speech),
        temperature=0.7,
        max_tokens=1500,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        )

    with open('./data/platform_response.json', 'w') as f:
        f.write(json.dumps(Platformresponse))

    with open('./data/summary.json', 'w') as f:
        f.write(Platformresponse.choices[0].text)

    print('usage', Platformresponse.usage.total_tokens)
    return Platformresponse.choices[0].text

def main():
    DEVICE = "cuda" if torch.cuda.is_available() else \
        "mps" if torch.backends.mps.is_available() else \
        "cpu"
    DEVICE = "cpu"
    print("Using {} device".format(DEVICE))

    model = whisper.load_model("base", device=DEVICE)
    # available models https://github.com/openai/whisper/blob/main/model-card.md
    print(
        f"Model is {'multilingual' if model.is_multilingual else 'English-only'} "
        f"and has {sum(np.prod(p.shape) for p in model.parameters()):,} parameters."
    )

    # print('downloading audio')
    # # Reading the YouTube link
    # video = "https://www.youtube.com/watch?v=IODxDxX7oi4"
    # data = pytube.YouTube(video)
    #
    # # Converting and downloading as 'MP4' file
    # audio = data.streams.get_audio_only()
    # audio.download(output_path='./data/audio.mp4')

    # print('parsing text')
    # transcript = model.transcribe('./data/audio.mp4')
    # print(transcript)
    # with open('./data/transcript.json', 'w') as f:
    #     f.write(json.dumps(transcript))

    with open('./data/transcript.json', 'r') as f:
        transcript = json.loads(f.read())

    summary = gpt3complete(transcript['text'])
    print('summary')
    print(summary)

    with open('./data/platform_response.json', 'r') as f:
        platform_response = json.loads(f.read())

    summary = platform_response['choices'][0]['text']
    print(summary)


if __name__ == '__main__':
    main()
