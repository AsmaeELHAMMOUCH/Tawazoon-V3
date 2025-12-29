# 🚀 Plan d'Optimisations Backend - Simulateur RH

## 📋 Vue d'ensemble

Ce document présente un plan d'optimisation complet pour améliorer les performances, la scalabilité et la maintenabilité du backend du Simulateur RH.

---

## 🎯 Objectifs

1. **Performance** : Réduire les temps de réponse de 50-70%
2. **Scalabilité** : Supporter 10x plus d'utilisateurs simultanés
3. **Maintenabilité** : Code plus propre et testable
4. **Coûts** : Réduire la charge serveur et base de données

---

## 📊 Analyse de l'existant

### Points critiques identifiés :
- ✅ Requêtes SQL multiples pour charger les référentiels
- ✅ Calculs de simulation lourds effectués de manière synchrone
- ✅ Pas de cache pour les données référentielles
- ✅ Jointures SQL non optimisées dans plusieurs endpoints

---

## 🔧 Optimisations Proposées

### 1️⃣ **Cache Redis pour les Référentiels** (Priorité: HAUTE)

#### Bénéfices attendus :
- ⚡ Réduction de 80% du temps de chargement des référentiels
- 📉 Diminution de la charge DB de 60%
- 🚀 Amélioration de l'expérience utilisateur

#### Implémentation :

```python
# backend/app/core/cache.py
import redis
from functools import wraps
import json
import hashlib
from typing import Optional, Callable, Any
from app.core.config import settings

# Configuration Redis
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

def cache_key(*args, **kwargs) -> str:
    """Génère une clé de cache unique basée sur les arguments"""
    key_data = f"{args}_{kwargs}"
    return hashlib.md5(key_data.encode()).hexdigest()

def redis_cache(ttl: int = 3600, prefix: str = ""):
    """
    Décorateur pour mettre en cache les résultats de fonction dans Redis
    
    Args:
        ttl: Durée de vie du cache en secondes (défaut: 1h)
        prefix: Préfixe pour la clé de cache
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Générer la clé de cache
            key = f"{prefix}:{func.__name__}:{cache_key(*args, **kwargs)}"
            
            # Tenter de récupérer depuis le cache
            try:
                cached = redis_client.get(key)
                if cached:
                    return json.loads(cached)
            except Exception as e:
                print(f"Cache read error: {e}")
            
            # Exécuter la fonction si pas en cache
            result = func(*args, **kwargs)
            
            # Stocker dans le cache
            try:
                redis_client.setex(
                    key,
                    ttl,
                    json.dumps(result, default=str)
                )
            except Exception as e:
                print(f"Cache write error: {e}")
            
            return result
        return wrapper
    return decorator

def invalidate_cache(pattern: str):
    """Invalide tous les caches correspondant au pattern"""
    try:
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)
    except Exception as e:
        print(f"Cache invalidation error: {e}")
```

#### Utilisation dans les services :

```python
# backend/app/services/referentiel_service.py
from app.core.cache import redis_cache, invalidate_cache
from sqlalchemy.orm import Session
from sqlalchemy import text

@redis_cache(ttl=7200, prefix="ref")  # Cache 2h
def get_referentiel_taches(db: Session, centre_id: int, poste_id: int):
    """
    Récupère le référentiel des tâches avec cache Redis
    """
    sql = text("""
        SELECT 
            t.id, t.nom_tache, t.phase, t.unite_mesure, 
            t.moyenne_min, t.centre_poste_id,
            p.code as poste_code, p.nom_poste, p.type_poste
        FROM dbo.taches t
        JOIN dbo.centre_poste cp ON t.centre_poste_id = cp.id
        JOIN dbo.postes p ON cp.poste_id = p.id
        WHERE cp.centre_id = :centre_id 
        AND cp.poste_id = :poste_id
    """)
    
    result = db.execute(sql, {"centre_id": centre_id, "poste_id": poste_id})
    return [dict(row._mapping) for row in result]

@redis_cache(ttl=3600, prefix="ref")  # Cache 1h
def get_centres_by_direction(db: Session, direction_id: int):
    """Récupère les centres d'une direction avec cache"""
    sql = text("""
        SELECT c.id, c.label, c.region_id
        FROM dbo.centres c
        WHERE c.direction_id = :direction_id
        ORDER BY c.label
    """)
    
    result = db.execute(sql, {"direction_id": direction_id})
    return [dict(row._mapping) for row in result]

def invalidate_referentiel_cache(centre_id: Optional[int] = None):
    """Invalide le cache des référentiels"""
    if centre_id:
        invalidate_cache(f"ref:*centre_id*{centre_id}*")
    else:
        invalidate_cache("ref:*")
```

---

### 2️⃣ **Optimisation des Requêtes SQL** (Priorité: HAUTE)

#### Problème actuel :
Requêtes multiples en cascade (N+1 queries)

#### Solution : Jointures optimisées

```python
# backend/app/services/optimized_queries.py
from sqlalchemy import text
from sqlalchemy.orm import Session
from typing import List, Dict

def get_direction_complete_data(db: Session, direction_id: int) -> Dict:
    """
    Récupère toutes les données d'une direction en UNE SEULE requête
    au lieu de multiples requêtes en cascade
    """
    sql = text("""
        WITH DirectionInfo AS (
            SELECT id, label, region_id
            FROM dbo.directions
            WHERE id = :direction_id
        ),
        CentresData AS (
            SELECT 
                c.id as centre_id,
                c.label as centre_label,
                c.region_id,
                cp.id as centre_poste_id,
                cp.poste_id,
                cp.effectif_actuel,
                p.code as poste_code,
                p.nom_poste,
                p.type_poste
            FROM dbo.centres c
            JOIN dbo.centre_poste cp ON c.id = cp.centre_id
            JOIN dbo.postes p ON cp.poste_id = p.id
            WHERE c.direction_id = :direction_id
        ),
        TachesData AS (
            SELECT 
                t.*,
                cd.centre_id,
                cd.poste_code,
                cd.nom_poste,
                cd.type_poste,
                cd.effectif_actuel
            FROM dbo.taches t
            JOIN CentresData cd ON t.centre_poste_id = cd.centre_poste_id
        )
        SELECT 
            di.id as direction_id,
            di.label as direction_label,
            di.region_id,
            td.*
        FROM DirectionInfo di
        CROSS JOIN TachesData td
    """)
    
    result = db.execute(sql, {"direction_id": direction_id})
    rows = [dict(row._mapping) for row in result]
    
    # Restructurer les données
    if not rows:
        return None
    
    direction_data = {
        "id": rows[0]["direction_id"],
        "label": rows[0]["direction_label"],
        "region_id": rows[0]["region_id"],
        "centres": {}
    }
    
    for row in rows:
        centre_id = row["centre_id"]
        if centre_id not in direction_data["centres"]:
            direction_data["centres"][centre_id] = {
                "id": centre_id,
                "label": row.get("centre_label"),
                "postes": {},
                "taches": []
            }
        
        direction_data["centres"][centre_id]["taches"].append({
            "id": row["id"],
            "nom_tache": row["nom_tache"],
            "phase": row["phase"],
            "moyenne_min": row["moyenne_min"],
            "unite_mesure": row["unite_mesure"],
            "poste_code": row["poste_code"],
            "type_poste": row["type_poste"]
        })
    
    return direction_data
```

---

### 3️⃣ **Calculs Asynchrones avec Celery** (Priorité: MOYENNE)

#### Pour les simulations lourdes (Direction, Nationale)

```python
# backend/app/core/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "simulateur_rh",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Europe/Paris',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max
    task_soft_time_limit=240,  # Warning à 4 minutes
)
```

```python
# backend/app/tasks/simulation_tasks.py
from app.core.celery_app import celery_app
from app.services.direction_service import process_direction_simulation
from app.core.database import SessionLocal
from typing import Dict

@celery_app.task(bind=True, name="simulation.direction")
def async_direction_simulation(self, direction_id: int, request_data: Dict):
    """
    Tâche asynchrone pour calculer une simulation de direction
    """
    db = SessionLocal()
    try:
        # Mettre à jour le statut
        self.update_state(state='PROGRESS', meta={'progress': 0})
        
        # Exécuter la simulation
        result = process_direction_simulation(db, request_data)
        
        # Mettre à jour le statut
        self.update_state(state='PROGRESS', meta={'progress': 100})
        
        return result
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
    finally:
        db.close()

@celery_app.task(bind=True, name="simulation.nationale")
def async_nationale_simulation(self, request_data: Dict):
    """
    Tâche asynchrone pour calculer une simulation nationale
    """
    db = SessionLocal()
    try:
        # Simulation nationale (très lourde)
        self.update_state(state='PROGRESS', meta={'progress': 0})
        
        # TODO: Implémenter la logique nationale
        result = {"status": "completed"}
        
        self.update_state(state='PROGRESS', meta={'progress': 100})
        return result
    except Exception as e:
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise
    finally:
        db.close()
```

```python
# backend/app/api/simulation_async.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.tasks.simulation_tasks import async_direction_simulation
from celery.result import AsyncResult

router = APIRouter()

@router.post("/simulation/direction/{direction_id}/async")
def start_direction_simulation_async(
    direction_id: int,
    request_data: dict,
    db: Session = Depends(get_db)
):
    """
    Lance une simulation de direction en mode asynchrone
    Retourne un task_id pour suivre la progression
    """
    task = async_direction_simulation.delay(direction_id, request_data)
    
    return {
        "task_id": task.id,
        "status": "PENDING",
        "message": "Simulation lancée en arrière-plan"
    }

@router.get("/simulation/task/{task_id}")
def get_simulation_status(task_id: str):
    """
    Récupère le statut d'une simulation asynchrone
    """
    task = AsyncResult(task_id)
    
    if task.state == 'PENDING':
        response = {
            "state": task.state,
            "status": "En attente..."
        }
    elif task.state == 'PROGRESS':
        response = {
            "state": task.state,
            "progress": task.info.get('progress', 0),
            "status": "Calcul en cours..."
        }
    elif task.state == 'SUCCESS':
        response = {
            "state": task.state,
            "result": task.result,
            "status": "Terminé"
        }
    elif task.state == 'FAILURE':
        response = {
            "state": task.state,
            "error": str(task.info),
            "status": "Erreur"
        }
    else:
        response = {
            "state": task.state,
            "status": "État inconnu"
        }
    
    return response
```

---

### 4️⃣ **Pool de Connexions DB Optimisé** (Priorité: MOYENNE)

```python
# backend/app/core/database.py
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# Configuration optimisée du pool de connexions
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # Nombre de connexions permanentes
    max_overflow=10,       # Connexions supplémentaires en pic
    pool_timeout=30,       # Timeout pour obtenir une connexion
    pool_recycle=3600,     # Recycler les connexions après 1h
    pool_pre_ping=True,    # Vérifier la connexion avant utilisation
    echo=False,
    connect_args={
        "timeout": 30,
        "check_same_thread": False
    }
)

# Événement pour optimiser les requêtes
@event.listens_for(engine, "before_cursor_execute")
def receive_before_cursor_execute(conn, cursor, statement, params, context, executemany):
    """Log des requêtes lentes"""
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(engine, "after_cursor_execute")
def receive_after_cursor_execute(conn, cursor, statement, params, context, executemany):
    """Détection des requêtes lentes"""
    total = time.time() - conn.info['query_start_time'].pop()
    if total > 1.0:  # Requêtes > 1s
        logger.warning(f"Slow query ({total:.2f}s): {statement[:100]}")
```

---

### 5️⃣ **Compression des Réponses** (Priorité: BASSE)

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

app = FastAPI()

# Compression GZIP pour réduire la taille des réponses
app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Compresser si > 1KB
    compresslevel=6     # Niveau de compression (1-9)
)
```

---

### 6️⃣ **Pagination et Limitation** (Priorité: MOYENNE)

```python
# backend/app/api/pagination.py
from fastapi import Query
from typing import Optional, List, TypeVar, Generic
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int

def paginate(
    query,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100)
):
    """
    Applique la pagination à une requête SQLAlchemy
    """
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )
```

---

## 📦 Dépendances à Ajouter

```txt
# Cache
redis==5.0.1
hiredis==2.3.2

# Tâches asynchrones
celery==5.3.4
celery[redis]==5.3.4

# Monitoring
prometheus-client==0.19.0
```

---

## 🔄 Plan de Migration

### Phase 1 : Cache Redis (Semaine 1)
1. ✅ Installer Redis
2. ✅ Créer le module de cache
3. ✅ Appliquer le cache aux référentiels
4. ✅ Tests et validation

### Phase 2 : Optimisation SQL (Semaine 2)
1. ✅ Identifier les requêtes N+1
2. ✅ Réécrire avec jointures
3. ✅ Ajouter des index si nécessaire
4. ✅ Tests de performance

### Phase 3 : Celery (Semaine 3)
1. ✅ Setup Celery + Redis
2. ✅ Migrer simulations lourdes
3. ✅ Interface de suivi des tâches
4. ✅ Tests de charge

### Phase 4 : Optimisations diverses (Semaine 4)
1. ✅ Pool de connexions
2. ✅ Compression GZIP
3. ✅ Pagination
4. ✅ Monitoring

---

## 📈 Métriques de Succès

| Métrique | Avant | Objectif | Méthode de mesure |
|----------|-------|----------|-------------------|
| Temps réponse référentiels | ~500ms | <100ms | Logs + APM |
| Temps simulation Direction | ~3s | <1s | Logs + APM |
| Requêtes DB/requête | ~15 | <5 | Query counter |
| Charge CPU | 60% | <30% | Monitoring serveur |
| Utilisateurs simultanés | 10 | 100+ | Tests de charge |

---

## 🧪 Tests de Performance

```python
# backend/tests/performance/test_cache.py
import pytest
import time
from app.services.referentiel_service import get_referentiel_taches

def test_cache_performance(db_session):
    """Vérifie que le cache améliore les performances"""
    
    # Premier appel (sans cache)
    start = time.time()
    result1 = get_referentiel_taches(db_session, centre_id=1, poste_id=1)
    time_without_cache = time.time() - start
    
    # Deuxième appel (avec cache)
    start = time.time()
    result2 = get_referentiel_taches(db_session, centre_id=1, poste_id=1)
    time_with_cache = time.time() - start
    
    # Le cache doit être au moins 5x plus rapide
    assert time_with_cache < time_without_cache / 5
    assert result1 == result2
```

---

## 🚨 Points d'Attention

1. **Redis** : Prévoir un plan de backup et de haute disponibilité
2. **Celery** : Monitorer la file d'attente pour éviter les engorgements
3. **Cache** : Stratégie d'invalidation claire pour éviter les données obsolètes
4. **SQL** : Tester les performances avec des volumes de données réels

---

## 📚 Ressources

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [SQLAlchemy Performance](https://docs.sqlalchemy.org/en/20/faq/performance.html)
- [FastAPI Performance](https://fastapi.tiangolo.com/advanced/performance/)

---

## ✅ Checklist de Déploiement

- [ ] Redis installé et configuré
- [ ] Celery worker démarré
- [ ] Variables d'environnement configurées
- [ ] Tests de performance validés
- [ ] Monitoring en place
- [ ] Documentation mise à jour
- [ ] Formation équipe effectuée

---

**Date de création** : 26/12/2024  
**Dernière mise à jour** : 26/12/2024  
**Auteur** : Équipe Technique Simulateur RH
