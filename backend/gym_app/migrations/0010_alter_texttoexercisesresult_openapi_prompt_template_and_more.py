# Generated by Django 4.1.4 on 2022-12-10 20:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gym_app', '0009_texttoexercisesresult_succeed_to_parse'),
    ]

    operations = [
        migrations.AlterField(
            model_name='texttoexercisesresult',
            name='openapi_prompt_template',
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name='texttoexercisesresult',
            name='transcript_text',
            field=models.TextField(),
        ),
    ]
