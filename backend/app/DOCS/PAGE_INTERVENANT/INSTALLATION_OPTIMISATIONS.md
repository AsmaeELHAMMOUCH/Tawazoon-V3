# 🚀 Guide d'Installation des Optimisations Backend

Ce guide vous accompagne pas à pas pour installer et configurer les optimisations backend (Redis, Celery, Cache).

---

## 📋 Prérequis

- Python 3.9+
- Redis Server
- Accès à la base de données SQL Server

---

## 1️⃣ Installation de Redis

### Sur Windows

#### Option A : Via Chocolatey (Recommandé)
```powershell
# Installer Chocolatey si pas déjà fait
# Voir: https://chocolatey.org/install

# Installer Redis
choco install redis-64

# Démarrer Redis
redis-server
```

#### Option B : Via WSL (Windows Subsystem for Linux)
```bash
# Dans WSL Ubuntu
sudo apt update
sudo apt install redis-server

# Démarrer Redis
sudo service redis-server start

# Vérifier que Redis fonctionne
redis-cli ping
# Devrait retourner: PONG
```

#### Option C : Via Docker (Plus simple)
```powershell
# Installer Docker Desktop si pas déjà fait
# Voir: https://www.docker.com/products/docker-desktop

# Lancer Redis dans un conteneur
docker run -d -p 6379:6379 --name redis-simulateur redis:7-alpine

# Vérifier
docker ps
```

### Sur Linux/Mac
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server

# Mac (via Homebrew)
brew install redis
brew services start redis

# Vérifier
redis-cli ping
```

---

## 2️⃣ Installation des Dépendances Python

```powershell
# Aller dans le dossier backend
cd c:\Users\Aelhammouch\simulateur-rh-V2\backend

# Activer l'environnement virtuel
.\venv\Scripts\Activate.ps1

# Installer les nouvelles dépendances
pip install redis==5.0.1
pip install hiredis==2.3.2
pip install celery==5.3.4
pip install "celery[redis]==5.3.4"
pip install prometheus-client==0.19.0

# OU installer depuis le fichier requirements
pip install -r requirements_optimized.txt
```

---

## 3️⃣ Configuration

### Fichier `.env`

Ajouter les variables suivantes dans `backend/.env` :

```env
# Configuration Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=  # Laisser vide si pas de mot de passe

# Configuration Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

---

## 4️⃣ Démarrage des Services

### Terminal 1 : Redis (si pas déjà démarré)
```powershell
# Via installation directe
redis-server

# Via Docker
docker start redis-simulateur

# Via WSL
wsl sudo service redis-server start
```

### Terminal 2 : Celery Worker
```powershell
cd c:\Users\Aelhammouch\simulateur-rh-V2\backend
.\venv\Scripts\Activate.ps1

# Démarrer le worker Celery
celery -A app.core.celery_app worker --loglevel=info --pool=solo

# Sur Windows, utiliser --pool=solo
# Sur Linux/Mac, vous pouvez utiliser --pool=prefork
```

### Terminal 3 : FastAPI Backend
```powershell
cd c:\Users\Aelhammouch\simulateur-rh-V2\backend
.\venv\Scripts\Activate.ps1

# Démarrer le serveur FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## 5️⃣ Vérification de l'Installation

### Test Redis
```powershell
# Ouvrir un nouveau terminal
redis-cli

# Dans redis-cli
127.0.0.1:6379> ping
PONG
127.0.0.1:6379> set test "Hello Redis"
OK
127.0.0.1:6379> get test
"Hello Redis"
127.0.0.1:6379> exit
```

### Test Celery
```powershell
# Dans le terminal du worker Celery, vous devriez voir:
# [tasks]
#   . app.tasks.simulation_tasks.async_direction_simulation
#   . app.tasks.simulation_tasks.async_nationale_simulation
#   ...
```

### Test API
Ouvrir le navigateur : http://localhost:8000/docs

Vous devriez voir les nouveaux endpoints :
- `/api/async/simulation/direction/{direction_id}`
- `/api/async/task/{task_id}`
- `/api/async/health`

---

## 6️⃣ Intégration dans le Code Existant

### Exemple 1 : Utiliser le cache dans un service existant

```python
# Dans app/api/simulation.py (ou autre fichier)
from app.services.referentiel_service import get_referentiel_taches

@router.get("/centres/{centre_id}/postes/{poste_id}/taches")
def get_taches(centre_id: int, poste_id: int, db: Session = Depends(get_db)):
    """
    Cette route utilisera automatiquement le cache Redis
    grâce au décorateur @cache_referentiel
    """
    taches = get_referentiel_taches(db, centre_id, poste_id)
    return {"taches": taches}
```

### Exemple 2 : Lancer une simulation asynchrone

```python
# Dans app/api/directions.py
from app.tasks.simulation_tasks import async_direction_simulation

@router.post("/directions/{direction_id}/simulate-async")
def simulate_direction_async(
    direction_id: int,
    request: DirectionSimRequest,
    db: Session = Depends(get_db)
):
    """Lance la simulation en arrière-plan"""
    task = async_direction_simulation.delay(direction_id, request.dict())
    
    return {
        "task_id": task.id,
        "status_url": f"/api/async/task/{task.id}"
    }
```

### Exemple 3 : Invalider le cache après une modification

```python
# Dans app/api/refs.py (ou autre)
from app.services.referentiel_service import invalidate_referentiel_cache

@router.put("/centres/{centre_id}/taches/{tache_id}")
def update_tache(centre_id: int, tache_id: int, data: dict, db: Session = Depends(get_db)):
    """Mise à jour d'une tâche"""
    
    # ... logique de mise à jour ...
    
    # Invalider le cache pour ce centre
    invalidate_referentiel_cache(centre_id=centre_id)
    
    return {"message": "Tâche mise à jour"}
```

---

## 7️⃣ Monitoring

### Voir les clés en cache
```powershell
redis-cli

127.0.0.1:6379> KEYS *
# Liste toutes les clés

127.0.0.1:6379> KEYS ref:*
# Liste seulement les référentiels

127.0.0.1:6379> GET "ref:get_referentiel_taches:abc123"
# Voir le contenu d'une clé spécifique
```

### Statistiques du cache
```python
# Dans un script Python ou via l'API
from app.core.cache import get_cache_stats

stats = get_cache_stats()
print(stats)
# {
#   "status": "connected",
#   "used_memory": "2.5M",
#   "total_keys": 42,
#   "hits": 1250,
#   "misses": 85,
#   "hit_rate": 93.6
# }
```

### Monitoring Celery
```powershell
# Voir les tâches actives
celery -A app.core.celery_app inspect active

# Voir les workers
celery -A app.core.celery_app inspect stats

# Flower (interface web pour Celery) - Optionnel
pip install flower
celery -A app.core.celery_app flower
# Ouvrir http://localhost:5555
```

---

## 8️⃣ Tests de Performance

### Script de test
```python
# backend/test_optimizations.py
import time
import requests

BASE_URL = "http://localhost:8000"

def test_cache_performance():
    """Test l'amélioration de performance avec le cache"""
    
    # Premier appel (sans cache)
    start = time.time()
    r1 = requests.get(f"{BASE_URL}/api/centres/1/postes/1/taches")
    time_without_cache = time.time() - start
    
    # Deuxième appel (avec cache)
    start = time.time()
    r2 = requests.get(f"{BASE_URL}/api/centres/1/postes/1/taches")
    time_with_cache = time.time() - start
    
    print(f"Sans cache: {time_without_cache:.3f}s")
    print(f"Avec cache: {time_with_cache:.3f}s")
    print(f"Amélioration: {time_without_cache / time_with_cache:.1f}x plus rapide")

def test_async_simulation():
    """Test une simulation asynchrone"""
    
    # Lancer la simulation
    response = requests.post(
        f"{BASE_URL}/api/async/simulation/direction/1",
        json={
            "direction_id": 1,
            "centres_volumes": [],
            "productivite": 0.7,
            "heures_jour": 8.0
        }
    )
    
    task_id = response.json()["task_id"]
    print(f"Tâche lancée: {task_id}")
    
    # Suivre la progression
    while True:
        status = requests.get(f"{BASE_URL}/api/async/task/{task_id}").json()
        print(f"État: {status['state']} - {status.get('progress', 0)}%")
        
        if status['state'] in ['SUCCESS', 'FAILURE']:
            break
        
        time.sleep(1)
    
    print("Résultat:", status.get('result'))

if __name__ == "__main__":
    print("=== Test Cache ===")
    test_cache_performance()
    
    print("\n=== Test Simulation Async ===")
    test_async_simulation()
```

Exécuter :
```powershell
python test_optimizations.py
```

---

## 9️⃣ Déploiement en Production

### Systemd (Linux)

#### redis.service
```ini
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
Type=forking
ExecStart=/usr/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/bin/redis-cli shutdown
Restart=always

[Install]
WantedBy=multi-user.target
```

#### celery-worker.service
```ini
[Unit]
Description=Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/simulateur-rh/backend
Environment="PATH=/var/www/simulateur-rh/backend/venv/bin"
ExecStart=/var/www/simulateur-rh/backend/venv/bin/celery -A app.core.celery_app worker --loglevel=info --detach
Restart=always

[Install]
WantedBy=multi-user.target
```

### Docker Compose (Recommandé)

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: always

  celery-worker:
    build: ./backend
    command: celery -A app.core.celery_app worker --loglevel=info
    depends_on:
      - redis
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    restart: always

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
    depends_on:
      - redis
      - celery-worker
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    restart: always

volumes:
  redis_data:
```

Démarrer :
```bash
docker-compose up -d
```

---

## 🔧 Dépannage

### Redis ne démarre pas
```powershell
# Vérifier si le port 6379 est déjà utilisé
netstat -ano | findstr :6379

# Tuer le processus si nécessaire
taskkill /PID <PID> /F

# Redémarrer Redis
redis-server
```

### Celery ne trouve pas les tâches
```powershell
# Vérifier que le module est bien importé
python -c "from app.tasks.simulation_tasks import async_direction_simulation; print('OK')"

# Vérifier la configuration Celery
celery -A app.core.celery_app inspect registered
```

### Le cache ne fonctionne pas
```python
# Tester la connexion Redis
from app.core.cache import redis_client

if redis_client:
    print(redis_client.ping())  # Devrait afficher True
else:
    print("Redis non connecté")
```

---

## 📚 Ressources

- [Redis Documentation](https://redis.io/docs/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)

---

## ✅ Checklist de Déploiement

- [ ] Redis installé et démarré
- [ ] Dépendances Python installées
- [ ] Variables d'environnement configurées
- [ ] Celery worker démarré
- [ ] Backend FastAPI démarré
- [ ] Tests de cache validés
- [ ] Tests de simulations async validés
- [ ] Monitoring en place
- [ ] Documentation équipe mise à jour

---

**Bon déploiement ! 🚀**
