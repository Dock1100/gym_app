# Generated by Django 4.1.4 on 2022-12-16 13:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gym_app', '0017_texttoexercisesresult_transcript_length_in_token'),
    ]

    operations = [
        migrations.CreateModel(
            name='Subscriber',
            fields=[
                ('email', models.CharField(db_index=True, max_length=512, primary_key=True, serialize=False, unique=True)),
                ('date_created', models.DateField(auto_now_add=True)),
                ('date_last_login', models.DateField(auto_now=True)),
                ('is_subscriber', models.BooleanField(default=False)),
                ('login_nums', models.IntegerField(default=0)),
            ],
        ),
    ]
