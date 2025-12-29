"""
Module de gestion du cache Redis pour le Simulateur RH

Ce module fournit des décorateurs et fonctions utilitaires pour :
- Mettre en cache les résultats de fonctions
- Invalider le cache de manière sélective
- Gérer les clés de cache de manière cohérente
"""

import redis
from functools import wraps
import json
import hashlib
from typing import Optional, Callable, Any, Union
import logging
from datetime import timedelta

logger = logging.getLogger(__name__)

# Configuration Redis (à adapter selon votre environnement)
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB = 0
REDIS_PASSWORD = None  # Si nécessaire

# Initialisation du client Redis
try:
    redis_client = redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        decode_responses=True,
        socket_connect_timeout=5,
        socket_timeout=5,
        retry_on_timeout=True
    )
    # Test de connexion
    redis_client.ping()
    logger.info("✅ Connexion Redis établie avec succès")
except redis.ConnectionError as e:
    logger.warning(f"⚠️ Redis non disponible : {e}. Le cache sera désactivé.")
    redis_client = None
except Exception as e:
    logger.error(f"❌ Erreur Redis : {e}")
    redis_client = None


def _generate_cache_key(*args, **kwargs) -> str:
    """
    Génère une clé de cache unique basée sur les arguments
    
    Args:
        *args: Arguments positionnels
        **kwargs: Arguments nommés
        
    Returns:
        str: Hash MD5 des arguments
    """
    # Convertir les arguments en chaîne
    key_parts = []
    
    for arg in args:
        if isinstance(arg, (dict, list)):
            key_parts.append(json.dumps(arg, sort_keys=True, default=str))
        else:
            key_parts.append(str(arg))
    
    for k, v in sorted(kwargs.items()):
        if isinstance(v, (dict, list)):
            key_parts.append(f"{k}={json.dumps(v, sort_keys=True, default=str)}")
        else:
            key_parts.append(f"{k}={v}")
    
    key_data = "|".join(key_parts)
    return hashlib.md5(key_data.encode()).hexdigest()


def redis_cache(
    ttl: Union[int, timedelta] = 3600,
    prefix: str = "cache",
    key_builder: Optional[Callable] = None
):
    """
    Décorateur pour mettre en cache les résultats de fonction dans Redis
    
    Args:
        ttl: Durée de vie du cache en secondes (ou timedelta)
        prefix: Préfixe pour la clé de cache
        key_builder: Fonction personnalisée pour générer la clé de cache
        
    Usage:
        @redis_cache(ttl=3600, prefix="ref")
        def get_data(param1, param2):
            return expensive_operation(param1, param2)
    """
    if isinstance(ttl, timedelta):
        ttl = int(ttl.total_seconds())
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Si Redis n'est pas disponible, exécuter directement
            if redis_client is None:
                return func(*args, **kwargs)
            
            # Générer la clé de cache
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = _generate_cache_key(*args, **kwargs)
            
            full_key = f"{prefix}:{func.__name__}:{cache_key}"
            
            # Tenter de récupérer depuis le cache
            try:
                cached = redis_client.get(full_key)
                if cached:
                    logger.debug(f"✅ Cache HIT: {full_key[:50]}...")
                    return json.loads(cached)
                else:
                    logger.debug(f"❌ Cache MISS: {full_key[:50]}...")
            except Exception as e:
                logger.warning(f"⚠️ Erreur lecture cache: {e}")
            
            # Exécuter la fonction si pas en cache
            result = func(*args, **kwargs)
            
            # Stocker dans le cache
            try:
                redis_client.setex(
                    full_key,
                    ttl,
                    json.dumps(result, default=str, ensure_ascii=False)
                )
                logger.debug(f"💾 Cache SET: {full_key[:50]}... (TTL: {ttl}s)")
            except Exception as e:
                logger.warning(f"⚠️ Erreur écriture cache: {e}")
            
            return result
        
        # Ajouter une méthode pour invalider le cache de cette fonction
        def invalidate(*args, **kwargs):
            """Invalide le cache pour ces arguments spécifiques"""
            if redis_client is None:
                return
            
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = _generate_cache_key(*args, **kwargs)
            
            full_key = f"{prefix}:{func.__name__}:{cache_key}"
            try:
                redis_client.delete(full_key)
                logger.info(f"🗑️ Cache invalidé: {full_key[:50]}...")
            except Exception as e:
                logger.warning(f"⚠️ Erreur invalidation cache: {e}")
        
        wrapper.invalidate = invalidate
        return wrapper
    
    return decorator


def invalidate_cache(pattern: str) -> int:
    """
    Invalide tous les caches correspondant au pattern
    
    Args:
        pattern: Pattern de clés (ex: "ref:*", "ref:get_centres:*")
        
    Returns:
        int: Nombre de clés supprimées
        
    Usage:
        invalidate_cache("ref:*")  # Invalide tous les référentiels
        invalidate_cache("ref:get_centres:*")  # Invalide seulement get_centres
    """
    if redis_client is None:
        logger.warning("Redis non disponible, impossible d'invalider le cache")
        return 0
    
    try:
        deleted = 0
        for key in redis_client.scan_iter(match=pattern):
            redis_client.delete(key)
            deleted += 1
        
        logger.info(f"🗑️ {deleted} clés de cache invalidées (pattern: {pattern})")
        return deleted
    except Exception as e:
        logger.error(f"❌ Erreur invalidation cache: {e}")
        return 0


def clear_all_cache() -> bool:
    """
    Vide complètement le cache Redis
    
    ⚠️ ATTENTION : Cette fonction supprime TOUTES les données du cache
    
    Returns:
        bool: True si succès, False sinon
    """
    if redis_client is None:
        logger.warning("Redis non disponible")
        return False
    
    try:
        redis_client.flushdb()
        logger.warning("🗑️ TOUT le cache Redis a été vidé !")
        return True
    except Exception as e:
        logger.error(f"❌ Erreur vidage cache: {e}")
        return False


def get_cache_stats() -> dict:
    """
    Récupère des statistiques sur le cache Redis
    
    Returns:
        dict: Statistiques du cache
    """
    if redis_client is None:
        return {"status": "unavailable"}
    
    try:
        info = redis_client.info()
        return {
            "status": "connected",
            "used_memory": info.get("used_memory_human", "N/A"),
            "total_keys": redis_client.dbsize(),
            "hits": info.get("keyspace_hits", 0),
            "misses": info.get("keyspace_misses", 0),
            "hit_rate": (
                info.get("keyspace_hits", 0) / 
                (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1))
            ) * 100
        }
    except Exception as e:
        logger.error(f"❌ Erreur récupération stats: {e}")
        return {"status": "error", "message": str(e)}


# Décorateurs spécialisés pour différents types de données

def cache_referentiel(ttl: int = 7200):
    """
    Cache spécifique pour les référentiels (2h par défaut)
    Les référentiels changent rarement
    """
    return redis_cache(ttl=ttl, prefix="ref")


def cache_simulation(ttl: int = 1800):
    """
    Cache spécifique pour les simulations (30min par défaut)
    Les simulations peuvent être recalculées plus fréquemment
    """
    return redis_cache(ttl=ttl, prefix="sim")


def cache_user_data(ttl: int = 300):
    """
    Cache spécifique pour les données utilisateur (5min par défaut)
    Données volatiles qui changent fréquemment
    """
    return redis_cache(ttl=ttl, prefix="user")


# Exemple d'utilisation
if __name__ == "__main__":
    # Test du cache
    @redis_cache(ttl=60, prefix="test")
    def expensive_function(x, y):
        """Fonction coûteuse à calculer"""
        import time
        time.sleep(2)  # Simule un calcul long
        return x + y
    
    print("Premier appel (sans cache)...")
    result1 = expensive_function(5, 3)
    print(f"Résultat: {result1}")
    
    print("\nDeuxième appel (avec cache)...")
    result2 = expensive_function(5, 3)
    print(f"Résultat: {result2}")
    
    print("\nStatistiques du cache:")
    print(get_cache_stats())
    
    print("\nInvalidation du cache...")
    expensive_function.invalidate(5, 3)
    
    print("\nTroisième appel (cache invalidé)...")
    result3 = expensive_function(5, 3)
    print(f"Résultat: {result3}")
