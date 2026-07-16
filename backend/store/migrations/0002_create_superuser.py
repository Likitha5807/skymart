from django.db import migrations
from django.contrib.auth.models import User

def create_superuser(apps, schema_editor):
    if not User.objects.filter(username='hiteshwar').exists():
        User.objects.create_superuser(
            username='hiteshwar',
            email='hitesh@example.com',
            password='hitesh123'
        )

class Migration(migrations.Migration):
    dependencies = [
        ('store', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_superuser),
    ]