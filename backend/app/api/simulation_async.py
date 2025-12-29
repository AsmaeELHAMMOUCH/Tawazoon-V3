"""
API endpoints pour les simulations asynchrones

Ce module fournit des endpoints pour lancer et suivre
les simulations en mode asynchrone via Celery.
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from celery.result import AsyncResult
from typing import Optional
import logging

from app.core.database import get_db
from app.tasks.simulation_tasks import (
    async_direction_simulation,
    async_nationale_simulation,
    async_centre_batch_simulation
)
from app.schemas.direction_sim import DirectionSimRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/async", tags=["Simulations Asynchrones"])


@router.post("/simulation/direction/{direction_id}")
def start_direction_simulation_async(
    direction_id: int,
    request: DirectionSimRequest,
    db: Session = Depends(get_db)
):
    """
    Lance une simulation de direction en mode asynchrone
    
    Cette route est recommandée pour les simulations lourdes
    qui prennent plus de 2-3 secondes.
    
    Args:
        direction_id: ID de la direction
        request: Paramètres de simulation
        
    Returns:
        Dict contenant le task_id pour suivre la progression
        
    Example:
        POST /api/async/simulation/direction/5
        {
            "direction_id": 5,
            "centres_volumes": [...],
            "productivite": 0.7,
            "heures_jour": 8.0
        }
        
        Response:
        {
            "task_id": "abc-123-def",
            "status": "PENDING",
            "message": "Simulation lancée en arrière-plan",
            "check_status_url": "/api/async/task/abc-123-def"
        }
    """
    logger.info(f"📤 Lancement simulation asynchrone direction {direction_id}")
    
    try:
        # Convertir le request Pydantic en dict pour Celery
        request_data = request.dict()
        
        # Lancer la tâche asynchrone
        task = async_direction_simulation.delay(direction_id, request_data)
        
        return {
            "task_id": task.id,
            "status": "PENDING",
            "message": "Simulation lancée en arrière-plan",
            "check_status_url": f"/api/async/task/{task.id}",
            "direction_id": direction_id
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lancement simulation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du lancement de la simulation: {str(e)}"
        )


@router.post("/simulation/nationale")
def start_nationale_simulation_async(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Lance une simulation nationale en mode asynchrone
    
    La simulation nationale est très lourde et DOIT être
    exécutée en mode asynchrone.
    
    Args:
        request: Paramètres de simulation nationale
        
    Returns:
        Dict contenant le task_id pour suivre la progression
    """
    logger.info("📤 Lancement simulation asynchrone nationale")
    
    try:
        task = async_nationale_simulation.delay(request)
        
        return {
            "task_id": task.id,
            "status": "PENDING",
            "message": "Simulation nationale lancée en arrière-plan",
            "check_status_url": f"/api/async/task/{task.id}",
            "estimated_duration": "2-5 minutes"
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lancement simulation nationale: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du lancement de la simulation: {str(e)}"
        )


@router.post("/simulation/centres/batch")
def start_centres_batch_simulation(
    centre_ids: list[int],
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Lance des simulations pour plusieurs centres en batch
    
    Args:
        centre_ids: Liste des IDs de centres
        request: Paramètres communs de simulation
        
    Returns:
        Dict contenant le task_id pour suivre la progression
    """
    logger.info(f"📤 Lancement batch simulation {len(centre_ids)} centres")
    
    if len(centre_ids) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 centres par batch"
        )
    
    try:
        task = async_centre_batch_simulation.delay(centre_ids, request)
        
        return {
            "task_id": task.id,
            "status": "PENDING",
            "message": f"Simulation batch de {len(centre_ids)} centres lancée",
            "check_status_url": f"/api/async/task/{task.id}",
            "total_centres": len(centre_ids)
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lancement batch: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du lancement du batch: {str(e)}"
        )


@router.get("/task/{task_id}")
def get_task_status(task_id: str):
    """
    Récupère le statut d'une tâche asynchrone
    
    Cette route doit être appelée régulièrement (polling)
    pour suivre la progression de la simulation.
    
    Args:
        task_id: ID de la tâche retourné lors du lancement
        
    Returns:
        Dict contenant l'état actuel de la tâche
        
    Example:
        GET /api/async/task/abc-123-def
        
        Response (en cours):
        {
            "task_id": "abc-123-def",
            "state": "PROGRESS",
            "progress": 45,
            "status": "Calcul en cours...",
            "result": null
        }
        
        Response (terminé):
        {
            "task_id": "abc-123-def",
            "state": "SUCCESS",
            "progress": 100,
            "status": "Terminé",
            "result": { ... }
        }
    """
    try:
        task = AsyncResult(task_id)
        
        response = {
            "task_id": task_id,
            "state": task.state,
        }
        
        if task.state == 'PENDING':
            response.update({
                "progress": 0,
                "status": "En attente de démarrage...",
                "result": None
            })
            
        elif task.state == 'PROGRESS':
            info = task.info or {}
            response.update({
                "progress": info.get('progress', 0),
                "status": info.get('status', 'Calcul en cours...'),
                "result": None,
                "details": info
            })
            
        elif task.state == 'SUCCESS':
            response.update({
                "progress": 100,
                "status": "Terminé avec succès",
                "result": task.result
            })
            
        elif task.state == 'FAILURE':
            response.update({
                "progress": 0,
                "status": "Erreur lors du calcul",
                "error": str(task.info),
                "result": None
            })
            
        else:
            response.update({
                "progress": 0,
                "status": f"État inconnu: {task.state}",
                "result": None
            })
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération statut tâche {task_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération du statut: {str(e)}"
        )


@router.delete("/task/{task_id}")
def cancel_task(task_id: str):
    """
    Annule une tâche en cours
    
    ⚠️ L'annulation n'est pas garantie si la tâche a déjà commencé
    
    Args:
        task_id: ID de la tâche à annuler
        
    Returns:
        Dict confirmant l'annulation
    """
    try:
        task = AsyncResult(task_id)
        
        if task.state in ['PENDING', 'PROGRESS']:
            task.revoke(terminate=True)
            logger.info(f"🛑 Tâche {task_id} annulée")
            
            return {
                "task_id": task_id,
                "status": "cancelled",
                "message": "Tâche annulée avec succès"
            }
        else:
            return {
                "task_id": task_id,
                "status": task.state,
                "message": f"Impossible d'annuler une tâche en état {task.state}"
            }
            
    except Exception as e:
        logger.error(f"❌ Erreur annulation tâche {task_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'annulation: {str(e)}"
        )


@router.get("/tasks/active")
def get_active_tasks():
    """
    Liste toutes les tâches actives
    
    Utile pour le monitoring et le debugging
    
    Returns:
        Dict contenant la liste des tâches actives
    """
    try:
        from app.core.celery_app import celery_app
        
        # Récupérer les tâches actives
        inspect = celery_app.control.inspect()
        active = inspect.active()
        scheduled = inspect.scheduled()
        
        return {
            "active_tasks": active or {},
            "scheduled_tasks": scheduled or {},
            "total_active": sum(len(tasks) for tasks in (active or {}).values()),
            "total_scheduled": sum(len(tasks) for tasks in (scheduled or {}).values())
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération tâches actives: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des tâches: {str(e)}"
        )


@router.get("/stats")
def get_celery_stats():
    """
    Récupère des statistiques sur Celery
    
    Returns:
        Dict contenant les statistiques
    """
    try:
        from app.core.celery_app import celery_app
        
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        
        return {
            "workers": stats or {},
            "total_workers": len(stats or {})
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur récupération stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des stats: {str(e)}"
        )


# Health check pour Celery
@router.get("/health")
def celery_health_check():
    """
    Vérifie que Celery est opérationnel
    
    Returns:
        Dict avec le statut de santé
    """
    try:
        from app.core.celery_app import celery_app
        
        # Tester la connexion au broker
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        
        if stats:
            return {
                "status": "healthy",
                "workers_online": len(stats),
                "message": "Celery est opérationnel"
            }
        else:
            return {
                "status": "degraded",
                "workers_online": 0,
                "message": "Aucun worker Celery détecté"
            }
            
    except Exception as e:
        logger.error(f"❌ Health check Celery échoué: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "message": "Celery non disponible"
        }
