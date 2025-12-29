"""
Configuration Celery pour les tâches asynchrones

Ce module configure Celery pour exécuter des tâches en arrière-plan,
notamment pour les simulations lourdes (Direction, Nationale).
"""

from celery import Celery
from celery.schedules import crontab
import os

# Configuration Redis comme broker et backend
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")
REDIS_DB = os.getenv("REDIS_DB", "0")

CELERY_BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/1"
CELERY_RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/2"

# Initialisation de l'application Celery
celery_app = Celery(
    "simulateur_rh",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.simulation_tasks",
        "app.tasks.export_tasks"
    ]
)

# Configuration de Celery
celery_app.conf.update(
    # Sérialisation
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    
    # Timezone
    timezone='Europe/Paris',
    enable_utc=True,
    
    # Limites de temps
    task_time_limit=600,        # 10 minutes max (hard limit)
    task_soft_time_limit=540,   # 9 minutes (soft limit, warning)
    
    # Tracking
    task_track_started=True,
    task_send_sent_event=True,
    
    # Résultats
    result_expires=3600,        # Les résultats expirent après 1h
    result_extended=True,
    
    # Worker
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
    
    # Retry
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
)

# Tâches périodiques (optionnel)
celery_app.conf.beat_schedule = {
    # Nettoyage du cache tous les jours à 2h du matin
    'cleanup-cache-daily': {
        'task': 'app.tasks.maintenance_tasks.cleanup_old_cache',
        'schedule': crontab(hour=2, minute=0),
    },
    # Nettoyage des résultats de simulation anciens
    'cleanup-simulations-weekly': {
        'task': 'app.tasks.maintenance_tasks.cleanup_old_simulations',
        'schedule': crontab(day_of_week=0, hour=3, minute=0),  # Dimanche 3h
    },
}

# Routes des tâches (optionnel, pour répartir les tâches sur différentes queues)
celery_app.conf.task_routes = {
    'app.tasks.simulation_tasks.*': {'queue': 'simulations'},
    'app.tasks.export_tasks.*': {'queue': 'exports'},
    'app.tasks.maintenance_tasks.*': {'queue': 'maintenance'},
}


if __name__ == '__main__':
    celery_app.start()
