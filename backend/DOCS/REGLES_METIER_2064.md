# Architecture des Règles Métier - Centre 2064

## 📋 Vue d'ensemble

Ce document décrit l'architecture modulaire des règles métier implémentée spécifiquement pour le **centre 2064**, sans impacter la logique existante des autres centres.

## 🎯 Objectifs

1. **Isolation** : Les règles du centre 2064 sont complètement isolées
2. **Non-intrusif** : Aucune modification de la logique existante
3. **Extensible** : Facile d'ajouter de nouvelles règles
4. **Maintenable** : Code clair et documenté

## 🏗️ Architecture

```
backend/app/services/
├── simulation_data_driven.py      # Moteur principal (modifié minimalement)
├── business_rules_2064.py         # 🆕 Règles métier centre 2064
└── data_driven_engine.py          # Moteur data-driven existant
```

### Flux de calcul

```
1. Détection du centre_id
   ↓
2. Si centre_id == 2064 → Activer BusinessRules2064
   ↓
3. Pour chaque tâche :
   a. Essayer d'appliquer une règle métier 2064
   b. Si règle trouvée → Utiliser le calcul spécifique
   c. Sinon → Utiliser la logique existante
```

## 📐 Règle 1 : Calcul CO Arrivée

### Formule

```
charge_minutes = base_calcul × chrono_minute × volume_CO_arrivee_global × (1 - pr_AXES)
```

### Critères d'application

| Critère | Valeur |
|---------|--------|
| **Produit** | `CO` (Colis) |
| **Famille UO** | Contient "ARRIVEE" |
| **Base Calcul** | `40` (ED) |

### Paramètres requis

- `chrono_minute` : Temps unitaire de la tâche (depuis BDD)
- `base_calcul` : 40 (depuis BDD)
- `volume_CO_arrivee_global` : Volume global CO en arrivée (depuis UI)
- `pr_AXES` : Pourcentage Axes (depuis UI, ex: 60%)

### Exemple de calcul

```python
# Données d'entrée
chrono_minute = 0.5        # 30 secondes par colis
base_calcul = 40           # 40% ED
volume_CO = 1_043_148      # Volume journalier global
pr_AXES = 60               # 60% Axes

# Calcul
facteur_base = 40 / 100 = 0.40
facteur_axes = 1 - (60/100) = 0.40

charge_minutes = 0.40 × 0.5 × 1_043_148 × 0.40
               = 83_451.84 minutes
```

## 🔧 Comment ajouter une nouvelle règle

### Étape 1 : Définir la méthode de matching

```python
def _match_regle_nouvelle(self, produit, famille_uo, unite_mesure, base_calcul):
    """
    Critères pour identifier quand appliquer cette règle
    """
    return (
        produit == 'VOTRE_PRODUIT' and
        'VOTRE_FAMILLE' in famille_uo.upper() and
        base_calcul == VOTRE_BASE
    )
```

### Étape 2 : Implémenter le calcul

```python
def _appliquer_regle_nouvelle(self, chrono_minute, base_calcul, volumes, parametres):
    """
    Logique de calcul spécifique
    """
    # Extraire les données nécessaires
    volume = self._extraire_volume_specifique(volumes)
    param = parametres.get('VOTRE_PARAM', 0.0)
    
    # Appliquer la formule
    charge = chrono_minute * volume * param
    
    return charge
```

### Étape 3 : Ajouter dans le dispatcher

```python
def calculer_charge_minutes(self, tache, volumes, parametres):
    # ... code existant ...
    
    # Nouvelle règle
    if self._match_regle_nouvelle(produit, famille_uo, unite_mesure, base_calcul):
        return self._appliquer_regle_nouvelle(
            chrono_minute, base_calcul, volumes, parametres
        )
```

## 📊 Structure des données

### Volumes (entrée)

```python
volumes = {
    'ARRIVEE': {
        'CO': {
            'GLOBAL': 1043148,
            'PART': 17397,
            'PRO': 92520,
            'DIST': 0,
            'AXES': 0
        },
        'Amana': {...},
        'CR': {...},
        'E-Banka': {...}
    },
    'DEPART': {...},
    'GUICHET': {...}
}
```

### Paramètres (entrée)

```python
parametres = {
    'pr_AXES': 60.0,          # Pourcentage Axes
    'pr_heures_ED': 40.0,     # Pourcentage ED
    'nb_colis_sac': 10.0,     # Colis par sac
    'nb_heures_jour': 8.0,    # Heures par jour
    'pr_collecte': 5.0        # Pourcentage collecte
}
```

## 🧪 Tests

### Test unitaire de la règle CO Arrivée

```python
def test_regle_co_arrivee():
    # Arrange
    business_rules = BusinessRules2064(centre_id=2064)
    
    tache_mock = type('obj', (object,), {
        'produit': 'CO',
        'famille_uo': 'Arrivée Camion',
        'unite_mesure': 'colis',
        'base_calcul': 40,
        'chrono': 0.5
    })
    
    volumes = {
        'ARRIVEE': {
            'CO': {'GLOBAL': 1000000}
        }
    }
    
    parametres = {'pr_AXES': 60.0}
    
    # Act
    charge = business_rules.calculer_charge_minutes(
        tache_mock, volumes, parametres
    )
    
    # Assert
    # 0.40 × 0.5 × 1000000 × 0.40 = 80000
    assert charge == 80000.0
```

## 📝 Checklist d'ajout de règle

- [ ] Définir les critères de matching clairs
- [ ] Documenter la formule mathématique
- [ ] Implémenter la méthode `_match_regle_XXX`
- [ ] Implémenter la méthode `_appliquer_regle_XXX`
- [ ] Ajouter dans le dispatcher principal
- [ ] Écrire un test unitaire
- [ ] Documenter dans ce fichier
- [ ] Tester avec des données réelles

## 🚀 Activation/Désactivation

Le moteur est automatiquement activé si `centre_id == 2064`.

Pour désactiver temporairement :
```python
# Dans business_rules_2064.py
self.is_active = False  # Force désactivation
```

## 📞 Support

Pour toute question sur l'architecture ou l'ajout de nouvelles règles, consulter :
- `business_rules_2064.py` : Code source commenté
- Ce document : Architecture et exemples
- Tests unitaires : Exemples d'utilisation
