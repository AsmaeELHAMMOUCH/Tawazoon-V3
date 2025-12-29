"""
Tâches asynchrones pour les simulations

Ce module contient les tâches Celery pour exécuter les simulations
en arrière-plan, notamment pour les vues Direction et Nationale.
"""

from celery import Task
from typing import Dict, Any
import logging
from datetime import datetime

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.direction_service import process_direction_simulation
from app.schemas.direction_sim import DirectionSimRequest

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """
    Tâche de base qui gère automatiquement la session de base de données
    """
    _db = None
    
    def after_return(self, *args, **kwargs):
        """Ferme la session DB après l'exécution"""
        if self._db is not None:
            self._db.close()
            self._db = None
    
    @property
    def db(self):
        """Récupère ou crée une session DB"""
        if self._db is None:
            self._db = SessionLocal()
        return self._db


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="simulation.direction",
    max_retries=3,
    default_retry_delay=60
)
def async_direction_simulation(
    self,
    direction_id: int,
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Tâche asynchrone pour calculer une simulation de direction
    
    Args:
        direction_id: ID de la direction
        request_data: Données de la requête (volumes, paramètres)
        
    Returns:
        Dict: Résultats de la simulation
        
    Raises:
        Exception: En cas d'erreur de calcul
    """
    logger.info(f"🚀 Démarrage simulation direction {direction_id} (task_id={self.request.id})")
    
    try:
        # Mettre à jour le statut: démarrage
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': 0,
                'status': 'Initialisation...',
                'direction_id': direction_id,
                'started_at': datetime.now().isoformat()
            }
        )
        
        # Convertir le dict en objet DirectionSimRequest
        from pydantic import parse_obj_as
        request = parse_obj_as(DirectionSimRequest, request_data)
        
        # Mettre à jour le statut: chargement données
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': 20,
                'status': 'Chargement des données...',
                'direction_id': direction_id
            }
        )
        
        # Exécuter la simulation
        result = process_direction_simulation(self.db, request)
        
        # Mettre à jour le statut: calculs en cours
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': 80,
                'status': 'Finalisation...',
                'direction_id': direction_id
            }
        )
        
        # Préparer le résultat final
        final_result = {
            'success': True,
            'direction_id': direction_id,
            'task_id': self.request.id,
            'completed_at': datetime.now().isoformat(),
            'data': result
        }
        
        logger.info(f"✅ Simulation direction {direction_id} terminée avec succès")
        
        return final_result
        
    except Exception as e:
        logger.error(f"❌ Erreur simulation direction {direction_id}: {str(e)}", exc_info=True)
        
        # Mettre à jour le statut: erreur
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(e),
                'direction_id': direction_id,
                'failed_at': datetime.now().isoformat()
            }
        )
        
        # Retry si possible
        if self.request.retries < self.max_retries:
            logger.warning(f"⚠️ Retry {self.request.retries + 1}/{self.max_retries}")
            raise self.retry(exc=e)
        
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="simulation.nationale",
    max_retries=2,
    default_retry_delay=120
)
def async_nationale_simulation(
    self,
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Tâche asynchrone pour calculer une simulation nationale
    
    Cette tâche est particulièrement lourde car elle agrège
    toutes les directions.
    
    Args:
        request_data: Données de la requête (volumes, paramètres)
        
    Returns:
        Dict: Résultats de la simulation nationale
    """
    logger.info(f"🚀 Démarrage simulation nationale (task_id={self.request.id})")
    
    try:
        # Mettre à jour le statut
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': 0,
                'status': 'Initialisation simulation nationale...',
                'started_at': datetime.now().isoformat()
            }
        )
        
        # TODO: Implémenter la logique de simulation nationale
        # Pour l'instant, retourner un placeholder
        
        self.update_state(
            state='PROGRESS',
            meta={
                'progress': 50,
                'status': 'Agrégation des données...'
            }
        )
        
        # Simuler un calcul long
        import time
        time.sleep(2)
        
        result = {
            'success': True,
            'task_id': self.request.id,
            'completed_at': datetime.now().isoformat(),
            'data': {
                'total_etp': 0,
                'total_centres': 0,
                'message': 'Simulation nationale à implémenter'
            }
        }
        
        logger.info("✅ Simulation nationale terminée")
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur simulation nationale: {str(e)}", exc_info=True)
        
        self.update_state(
            state='FAILURE',
            meta={
                'error': str(e),
                'failed_at': datetime.now().isoformat()
            }
        )
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e)
        
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="simulation.centre_batch"
)
def async_centre_batch_simulation(
    self,
    centre_ids: list,
    request_data: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Tâche asynchrone pour calculer plusieurs simulations de centres en batch
    
    Args:
        centre_ids: Liste des IDs de centres
        request_data: Données de la requête communes
        
    Returns:
        Dict: Résultats agrégés des simulations
    """
    logger.info(f"🚀 Démarrage batch simulation {len(centre_ids)} centres")
    
    try:
        results = []
        total = len(centre_ids)
        
        for idx, centre_id in enumerate(centre_ids):
            # Mettre à jour la progression
            progress = int((idx / total) * 100)
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'status': f'Simulation centre {idx + 1}/{total}...',
                    'current_centre': centre_id
                }
            )
            
            # TODO: Exécuter la simulation pour ce centre
            # results.append(...)
            
        return {
            'success': True,
            'total_centres': total,
            'results': results,
            'completed_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur batch simulation: {str(e)}", exc_info=True)
        raise


# Tâches de maintenance

@celery_app.task(name="maintenance.cleanup_old_cache")
def cleanup_old_cache():
    """
    Nettoie les entrées de cache obsolètes
    """
    logger.info("🧹 Nettoyage du cache...")
    
    from app.core.cache import get_cache_stats
    
    stats_before = get_cache_stats()
    
    # TODO: Implémenter la logique de nettoyage
    
    stats_after = get_cache_stats()
    
    logger.info(f"✅ Nettoyage terminé. Clés avant: {stats_before.get('total_keys')}, après: {stats_after.get('total_keys')}")


@celery_app.task(name="maintenance.cleanup_old_simulations")
def cleanup_old_simulations():
    """
    Nettoie les anciennes simulations de la base de données
    """
    logger.info("🧹 Nettoyage des anciennes simulations...")
    
    db = SessionLocal()
    try:
        from sqlalchemy import text
        from datetime import timedelta
        
        # Supprimer les simulations de plus de 30 jours
        cutoff_date = datetime.now() - timedelta(days=30)
        
        sql = text("""
            DELETE FROM dbo.simulation_run
            WHERE created_at < :cutoff_date
        """)
        
        result = db.execute(sql, {"cutoff_date": cutoff_date})
        db.commit()
        
        logger.info(f"✅ {result.rowcount} anciennes simulations supprimées")
        
    except Exception as e:
        logger.error(f"❌ Erreur nettoyage simulations: {e}")
        db.rollback()
    finally:
        db.close()


# Exemple d'utilisation
if __name__ == "__main__":
    # Test d'une tâche
    result = async_direction_simulation.delay(
        direction_id=1,
        request_data={
            "direction_id": 1,
            "centres_volumes": [],
            "productivite": 0.7,
            "heures_jour": 8.0
        }
    )
    
    print(f"Tâche lancée: {result.id}")
    print(f"État: {result.state}")
