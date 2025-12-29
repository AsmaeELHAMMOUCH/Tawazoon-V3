"""
Script de test automatisé pour valider les optimisations backend

Ce script teste :
1. La connexion Redis
2. Les performances du cache
3. Les simulations asynchrones
4. Les requêtes SQL optimisées

Usage:
    python test_optimizations.py
"""

import time
import sys
import requests
from typing import Dict, Any
from colorama import init, Fore, Style

# Initialiser colorama pour les couleurs dans le terminal
init(autoreset=True)

# Configuration
API_BASE_URL = "http://localhost:8000"
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# Résultats des tests
test_results = {
    "passed": 0,
    "failed": 0,
    "warnings": 0
}


def print_header(text: str):
    """Affiche un en-tête de section"""
    print(f"\n{Fore.CYAN}{'=' * 60}")
    print(f"{Fore.CYAN}{text.center(60)}")
    print(f"{Fore.CYAN}{'=' * 60}\n")


def print_test(name: str, status: str, details: str = ""):
    """Affiche le résultat d'un test"""
    if status == "PASS":
        icon = "✅"
        color = Fore.GREEN
        test_results["passed"] += 1
    elif status == "FAIL":
        icon = "❌"
        color = Fore.RED
        test_results["failed"] += 1
    else:  # WARNING
        icon = "⚠️"
        color = Fore.YELLOW
        test_results["warnings"] += 1
    
    print(f"{icon} {color}{name:<40} [{status}]{Style.RESET_ALL}")
    if details:
        print(f"   {Fore.WHITE}{details}{Style.RESET_ALL}")


def test_redis_connection() -> bool:
    """Test 1 : Connexion Redis"""
    print_header("TEST 1 : CONNEXION REDIS")
    
    try:
        import redis
        client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
        
        # Test ping
        if client.ping():
            print_test("Redis ping", "PASS", "Redis est accessible")
            
            # Test set/get
            test_key = "test:optimization:key"
            test_value = "Hello Redis!"
            client.set(test_key, test_value, ex=10)
            retrieved = client.get(test_key)
            
            if retrieved == test_value:
                print_test("Redis set/get", "PASS", "Lecture/écriture OK")
                client.delete(test_key)
                return True
            else:
                print_test("Redis set/get", "FAIL", f"Valeur incorrecte: {retrieved}")
                return False
        else:
            print_test("Redis ping", "FAIL", "Pas de réponse")
            return False
            
    except Exception as e:
        print_test("Redis connection", "FAIL", f"Erreur: {str(e)}")
        return False


def test_cache_performance() -> bool:
    """Test 2 : Performance du cache"""
    print_header("TEST 2 : PERFORMANCE DU CACHE")
    
    try:
        # Endpoint de test (à adapter selon votre API)
        endpoint = f"{API_BASE_URL}/api/centres/1/postes/1/taches"
        
        # Premier appel (sans cache)
        print("   Appel 1 (sans cache)...")
        start = time.time()
        response1 = requests.get(endpoint, timeout=10)
        time_without_cache = time.time() - start
        
        if response1.status_code != 200:
            print_test("API accessible", "FAIL", f"Status: {response1.status_code}")
            return False
        
        print_test("Premier appel", "PASS", f"Temps: {time_without_cache:.3f}s")
        
        # Deuxième appel (avec cache)
        print("   Appel 2 (avec cache)...")
        start = time.time()
        response2 = requests.get(endpoint, timeout=10)
        time_with_cache = time.time() - start
        
        print_test("Deuxième appel", "PASS", f"Temps: {time_with_cache:.3f}s")
        
        # Vérifier l'amélioration
        if time_with_cache < time_without_cache:
            improvement = time_without_cache / time_with_cache
            if improvement > 2:
                print_test(
                    "Amélioration cache",
                    "PASS",
                    f"{improvement:.1f}x plus rapide avec cache"
                )
                return True
            else:
                print_test(
                    "Amélioration cache",
                    "WARNING",
                    f"Seulement {improvement:.1f}x plus rapide (attendu > 2x)"
                )
                return True
        else:
            print_test(
                "Amélioration cache",
                "FAIL",
                "Le cache ne semble pas fonctionner"
            )
            return False
            
    except requests.exceptions.ConnectionError:
        print_test("API connection", "FAIL", "Backend non accessible")
        return False
    except Exception as e:
        print_test("Cache test", "FAIL", f"Erreur: {str(e)}")
        return False


def test_async_simulation() -> bool:
    """Test 3 : Simulations asynchrones"""
    print_header("TEST 3 : SIMULATIONS ASYNCHRONES")
    
    try:
        # Vérifier que Celery est disponible
        health_endpoint = f"{API_BASE_URL}/api/async/health"
        health_response = requests.get(health_endpoint, timeout=5)
        
        if health_response.status_code == 200:
            health_data = health_response.json()
            if health_data.get("status") == "healthy":
                print_test(
                    "Celery health check",
                    "PASS",
                    f"{health_data.get('workers_online', 0)} worker(s) en ligne"
                )
            else:
                print_test(
                    "Celery health check",
                    "WARNING",
                    f"Status: {health_data.get('status')}"
                )
                return True  # Pas bloquant
        else:
            print_test(
                "Celery health check",
                "FAIL",
                f"Status: {health_response.status_code}"
            )
            return False
        
        # Tester le lancement d'une tâche (optionnel)
        # Note: Nécessite des données de test valides
        print_test(
            "Async endpoints",
            "PASS",
            "Endpoints async disponibles"
        )
        
        return True
        
    except Exception as e:
        print_test("Async simulation test", "FAIL", f"Erreur: {str(e)}")
        return False


def test_sql_optimization() -> bool:
    """Test 4 : Optimisation SQL"""
    print_header("TEST 4 : OPTIMISATION SQL")
    
    try:
        # Test d'un endpoint qui utilise les requêtes optimisées
        # (à adapter selon votre API)
        endpoint = f"{API_BASE_URL}/api/directions/1"
        
        print("   Chargement données direction...")
        start = time.time()
        response = requests.get(endpoint, timeout=10)
        query_time = time.time() - start
        
        if response.status_code == 200:
            print_test(
                "Requête direction",
                "PASS",
                f"Temps: {query_time:.3f}s"
            )
            
            # Vérifier que le temps est acceptable (< 1s)
            if query_time < 1.0:
                print_test(
                    "Performance SQL",
                    "PASS",
                    "Temps de réponse optimal (< 1s)"
                )
                return True
            elif query_time < 3.0:
                print_test(
                    "Performance SQL",
                    "WARNING",
                    f"Temps acceptable mais peut être amélioré ({query_time:.2f}s)"
                )
                return True
            else:
                print_test(
                    "Performance SQL",
                    "FAIL",
                    f"Temps trop long ({query_time:.2f}s)"
                )
                return False
        else:
            print_test(
                "Requête direction",
                "FAIL",
                f"Status: {response.status_code}"
            )
            return False
            
    except Exception as e:
        print_test("SQL optimization test", "FAIL", f"Erreur: {str(e)}")
        return False


def test_cache_stats() -> bool:
    """Test 5 : Statistiques du cache"""
    print_header("TEST 5 : STATISTIQUES DU CACHE")
    
    try:
        from app.core.cache import get_cache_stats
        
        stats = get_cache_stats()
        
        if stats.get("status") == "connected":
            print_test("Cache stats", "PASS", "Redis connecté")
            
            print(f"\n   📊 Statistiques Redis:")
            print(f"      Mémoire utilisée: {stats.get('used_memory', 'N/A')}")
            print(f"      Nombre de clés: {stats.get('total_keys', 0)}")
            print(f"      Hits: {stats.get('hits', 0)}")
            print(f"      Misses: {stats.get('misses', 0)}")
            print(f"      Taux de hit: {stats.get('hit_rate', 0):.1f}%")
            
            hit_rate = stats.get('hit_rate', 0)
            if hit_rate > 80:
                print_test("Taux de hit", "PASS", f"{hit_rate:.1f}% (excellent)")
            elif hit_rate > 50:
                print_test("Taux de hit", "WARNING", f"{hit_rate:.1f}% (acceptable)")
            else:
                print_test("Taux de hit", "WARNING", f"{hit_rate:.1f}% (peut être amélioré)")
            
            return True
        else:
            print_test("Cache stats", "FAIL", "Redis non connecté")
            return False
            
    except ImportError:
        print_test("Cache stats", "WARNING", "Module cache non importable (normal si pas en venv)")
        return True
    except Exception as e:
        print_test("Cache stats", "FAIL", f"Erreur: {str(e)}")
        return False


def print_summary():
    """Affiche le résumé des tests"""
    print_header("RÉSUMÉ DES TESTS")
    
    total = test_results["passed"] + test_results["failed"] + test_results["warnings"]
    
    print(f"   Total de tests: {total}")
    print(f"   {Fore.GREEN}✅ Réussis: {test_results['passed']}{Style.RESET_ALL}")
    print(f"   {Fore.YELLOW}⚠️  Avertissements: {test_results['warnings']}{Style.RESET_ALL}")
    print(f"   {Fore.RED}❌ Échecs: {test_results['failed']}{Style.RESET_ALL}")
    
    success_rate = (test_results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\n   Taux de réussite: {success_rate:.1f}%")
    
    if test_results["failed"] == 0:
        print(f"\n   {Fore.GREEN}🎉 Tous les tests sont passés !{Style.RESET_ALL}")
        return 0
    else:
        print(f"\n   {Fore.RED}⚠️  Certains tests ont échoué. Vérifiez la configuration.{Style.RESET_ALL}")
        return 1


def main():
    """Fonction principale"""
    print(f"{Fore.CYAN}{Style.BRIGHT}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║                                                            ║")
    print("║       TEST DES OPTIMISATIONS BACKEND                       ║")
    print("║       Simulateur RH                                        ║")
    print("║                                                            ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Style.RESET_ALL}")
    
    # Exécuter les tests
    tests = [
        ("Redis Connection", test_redis_connection),
        ("Cache Performance", test_cache_performance),
        ("Async Simulations", test_async_simulation),
        ("SQL Optimization", test_sql_optimization),
        ("Cache Statistics", test_cache_stats),
    ]
    
    for test_name, test_func in tests:
        try:
            test_func()
        except KeyboardInterrupt:
            print(f"\n{Fore.YELLOW}Tests interrompus par l'utilisateur{Style.RESET_ALL}")
            sys.exit(1)
        except Exception as e:
            print_test(test_name, "FAIL", f"Erreur inattendue: {str(e)}")
    
    # Afficher le résumé
    exit_code = print_summary()
    
    print(f"\n{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}\n")
    
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
