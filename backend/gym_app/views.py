import json
from datetime import datetime
import logging

from django.http import HttpResponse

from gym_app.models import Video, TrainingLog, Subscriber
from gym_app.processors import process_video_to_exercises, process_rec_to_training_log

logger = logging.getLogger(__name__)

def parse_video_by_url(request):
    data = json.loads(request.body)
    video_url = data.get('videoUrl')
    if not video_url:
        return HttpResponse('no video_url', status=400)
    try:
        video = Video.objects.get(url=video_url)
    except Video.DoesNotExist:
        video = Video(url=video_url)
        video.save()
    text_to_exercises = process_video_to_exercises(video)

    return HttpResponse(json.dumps({
        'succeed_to_parse': text_to_exercises.succeed_to_parse,
        'url': video.url,
        'title': video.title,
        'duration_s': video.duration_s,
        'transcript_length': len(video.transcript_text),
        'exercises': text_to_exercises.exercises,
    }), content_type='application/json', status=200)


def reprocess_all_videos(request):
    videos = Video.objects.order_by('url').all()
    print('videos', len(videos))
    texts_to_exercises = []
    for i, video in enumerate(videos):
        print('video', i, '/', len(videos))
        t2e = process_video_to_exercises(video)
        texts_to_exercises.append({
            'url': video.url,
            'title': video.title,
            'duration_s': video.duration_s,
            'transcript_length': len(video.transcript_text),
            'succeed_to_parse': t2e.succeed_to_parse,
            'exercises': t2e.exercises if t2e.succeed_to_parse else 'FAIL',
            # 'openapi_response': t2e.openapi_response['choices'][0]['text'],
        })
    return HttpResponse(json.dumps(texts_to_exercises), content_type='application/json', status=200)


def upload_and_parse_training_log(request):
    file = request.FILES['file']
    rec_key = request.POST['rec_key']
    if rec_key == 'random':
        rec = next(TrainingLog.objects.raw('''
            select * from {0} where key is not NULL order by random() limit 1
        '''.format(TrainingLog._meta.db_table)).iterator())
    else:
        try:
            rec = TrainingLog.objects.get(key=rec_key)
            # rec.file = file
            # rec.save()
        except TrainingLog.DoesNotExist:
            rec = TrainingLog(key=rec_key)
            rec.file = file
            rec.save()

    text_to_training_log = process_rec_to_training_log(rec)

    return HttpResponse(json.dumps({
        'succeed_to_parse': text_to_training_log.succeed_to_parse,
        'training_log': text_to_training_log.training_log if text_to_training_log.succeed_to_parse else 'FAIL',
    }), content_type='application/json', status=200)


def reprocess_all_audio(request):
    all_recs = TrainingLog.objects.filter(key__isnull=False).order_by('date').all()
    data = []
    print('all_recs', len(all_recs))
    for i, rec in enumerate(all_recs):
        print(i, '/', len(all_recs))
        text_to_training_log = process_rec_to_training_log(rec)

        data.append({
            'text': rec.transcript_text,
            'succeed_to_parse': text_to_training_log.succeed_to_parse,
            'log': text_to_training_log.training_log if text_to_training_log.succeed_to_parse else 'FAIL',
            'openapi_response': text_to_training_log.openapi_response['choices'][0]['text'],
        })

    return HttpResponse(json.dumps(data, indent=True), content_type='application/json', status=200)


def register(request):
    logger.warning('register', request.body, exc_info=False)
    data = json.loads(request.body)
    email = data.get('email')
    is_subscriber = data.get('is_subscriber', False)
    if not email:
        return HttpResponse('no email', status=200)

    try:
        subscriber = Subscriber.objects.get(email=email)
    except Subscriber.DoesNotExist:
        subscriber = Subscriber(email=email)

    subscriber.login_nums = (subscriber.login_nums or 0) + 1
    subscriber.date_last_login = datetime.now()
    subscriber.is_subscriber = is_subscriber
    subscriber.is_or_subscriber = subscriber.is_or_subscriber or is_subscriber
    subscriber.save()
    return HttpResponse('thanks', status=200)
