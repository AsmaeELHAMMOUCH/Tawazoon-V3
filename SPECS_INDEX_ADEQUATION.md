# Index Adéquation - Spécifications

## Vue d'ensemble
Cette page permet d'analyser l'adéquation entre les effectifs actuels, calculés et recommandés pour un centre donné, avec des visualisations graphiques et des exports.

**⚠️ IMPORTANT**: Cette page **consomme les résultats de simulation** de la page **Intervenant**. Elle ne fait **PAS** d'appel API direct. Les données sont passées via `location.state` lors de la navigation depuis la page Intervenant ou Centre.

## Navigation vers la page

La page Index Adéquation est accessible depuis :
1. **Page Centres** : Bouton "Index Adéquation" dans les cartes de menu
2. **Page Intervenant** : Après une simulation réussie

### Données passées via `location.state`

```javascript
navigate("/app/simulation/index_Adequation", {
  state: {
    centreId: 123,
    centreLabel: "Centre Casablanca",
    simulationResults: {
      postes: [
        {
          poste_id: 1,
          poste_label: "Agent Opérations",
          effectif_statutaire: 8,
          effectif_aps: 2,
          etp_calcule: 12.5,
          etp_arrondi: 13,
          heures: 100.5
        },
        // ... autres postes
      ],
      total_heures: 500,
      total_etp_calcule: 50.5,
      total_etp_arrondi: 51
    },
    volumes: {
      1: { // poste_id
        mensuel: 5000,
        journalier: 250,
        horaire: 800
      },
      // ... autres postes
    }
  }
});
```
    {
      "poste": "Contrôleur",
      "effectif_actuel": 5,
      "effectif_calcule": 6,
      "effectif_recommande": 5,
      "dossiers_mois": 2000,
      "dossiers_par_jour": 100,
      "volume_activites_par_heure_total": 320
    }
  ]
}
```

## Modèles Pydantic

```python
from pydantic import BaseModel
from typing import List, Optional

class PositionAdequation(BaseModel):
    """Données d'adéquation pour une position"""
    poste: str
    effectif_actuel: int
    effectif_calcule: int
    effectif_recommande: int
    dossiers_mois: float
    dossiers_par_jour: float
    volume_activites_par_heure_total: float

class AdequationResponse(BaseModel):
    """Réponse complète pour l'analyse d'adéquation"""
    centre_id: int
    centre_label: str
    positions: List[PositionAdequation]
```

## Logique de Calcul (Frontend)

### 1. Calcul des Totaux
```javascript
totals = {
  actuel: sum(positions.effectif_actuel),
  calcule: sum(positions.effectif_calcule),
  recommande: sum(positions.effectif_recommande),
  dossiers_mois: sum(positions.dossiers_mois),
  dossiers_jour: sum(positions.dossiers_par_jour),
  volume_heure: sum(positions.volume_activites_par_heure_total)
}
```

### 2. Calcul des Indices
```javascript
indice_calc_vs_actuel = round((actuel_total / calcule_total) * 100)
indice_reco_vs_actuel = round((actuel_total / recommande_total) * 100)
indice_reco_vs_calc = round((calcule_total / recommande_total) * 100)
```

### 3. Calcul des Volumes Moyens (par ligne)
```javascript
volume_mois_actuel = dossiers_mois / effectif_actuel (si effectif > 0, sinon 0)
volume_mois_calcule = dossiers_mois / effectif_calcule (si effectif > 0, sinon 0)
volume_mois_recommande = dossiers_mois / effectif_recommande (si effectif > 0, sinon 0)
// Même logique pour jour et heure
```

### 4. Calcul des Volumes Moyens (ligne TOTAL)
```javascript
// Utiliser le total des effectifs, fallback à 1 si total = 0
effectif_for_avg = totals.actuel > 0 ? totals.actuel : 1
volume_mois_total = totals.dossiers_mois / effectif_for_avg
// Même logique pour calcule et recommande
```

### 5. Couleurs des Badges
```javascript
function getBadgeColor(value) {
  if (value >= 95 && value <= 105) return "green";  // Optimal
  if ((value >= 90 && value < 95) || (value > 105 && value <= 110)) return "orange";  // Acceptable
  return "red";  // Critique
}
```

## Requêtes SQL Server

### Récupération des données d'adéquation

```sql
-- Exemple de requête pour récupérer les données par position
SELECT 
    p.label AS poste,
    ISNULL(e.effectif_statutaire, 0) AS effectif_actuel,
    ISNULL(s.etp_calcule, 0) AS effectif_calcule,
    ISNULL(s.etp_arrondi, 0) AS effectif_recommande,
    ISNULL(v.dossiers_mois, 0) AS dossiers_mois,
    ISNULL(v.dossiers_par_jour, 0) AS dossiers_par_jour,
    ISNULL(v.volume_activites_par_heure_total, 0) AS volume_activites_par_heure_total
FROM postes p
LEFT JOIN effectifs e ON p.id = e.poste_id AND e.centre_id = @centre_id
LEFT JOIN simulations s ON p.id = s.poste_id AND s.centre_id = @centre_id
LEFT JOIN volumes v ON p.id = v.poste_id AND v.centre_id = @centre_id
WHERE p.centre_id = @centre_id
ORDER BY p.label;
```

## Implémentation Backend (FastAPI)

```python
# app/routers/adequation.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Centre, Poste, Effectif, Simulation, Volume
from app.schemas.adequation import AdequationResponse, PositionAdequation

router = APIRouter(prefix="/api/centres", tags=["adequation"])

@router.get("/{centre_id}/adequation", response_model=AdequationResponse)
async def get_adequation(
    centre_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère les données d'adéquation pour un centre
    """
    # Vérifier que le centre existe
    centre = db.query(Centre).filter(Centre.id == centre_id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Centre non trouvé")
    
    # Récupérer les postes avec leurs données
    query = db.query(
        Poste.label.label("poste"),
        Effectif.effectif_statutaire.label("effectif_actuel"),
        Simulation.etp_calcule.label("effectif_calcule"),
        Simulation.etp_arrondi.label("effectif_recommande"),
        Volume.dossiers_mois,
        Volume.dossiers_par_jour,
        Volume.volume_activites_par_heure_total
    ).outerjoin(
        Effectif, (Poste.id == Effectif.poste_id) & (Effectif.centre_id == centre_id)
    ).outerjoin(
        Simulation, (Poste.id == Simulation.poste_id) & (Simulation.centre_id == centre_id)
    ).outerjoin(
        Volume, (Poste.id == Volume.poste_id) & (Volume.centre_id == centre_id)
    ).filter(
        Poste.centre_id == centre_id
    ).all()
    
    positions = [
        PositionAdequation(
            poste=row.poste,
            effectif_actuel=row.effectif_actuel or 0,
            effectif_calcule=row.effectif_calcule or 0,
            effectif_recommande=row.effectif_recommande or 0,
            dossiers_mois=row.dossiers_mois or 0.0,
            dossiers_par_jour=row.dossiers_par_jour or 0.0,
            volume_activites_par_heure_total=row.volume_activites_par_heure_total or 0.0
        )
        for row in query
    ]
    
    return AdequationResponse(
        centre_id=centre_id,
        centre_label=centre.label,
        positions=positions
    )
```

## Exports

### 1. Export CSV Tableau Détaillé
Format: séparateur `;` (format FR)

```csv
TABLEAU RECAPITULATIF
Indicateur;Valeur
Effectif Actuel Total;17
Effectif Calculé Total;20
Effectif Recommandé Total;18
Volume Moyen/Mois (Actuel);458.82
Volume Moyen/Jour (Actuel);22.94
Volume Moyen/Heure (Actuel);73.41

TABLEAU DETAILLE
Poste;Effectif Actuel;Effectif Calculé;Effectif Recommandé;Vol Moy/Mois (Actuel);Vol Moy/Mois (Calc);Vol Moy/Mois (Reco);Vol Moy/Jour (Actuel);Vol Moy/Jour (Calc);Vol Moy/Jour (Reco);Vol Moy/Heure (Actuel);Vol Moy/Heure (Calc);Vol Moy/Heure (Reco)
Agent Opérations;10;12;11;500.00;416.67;454.55;25.00;20.83;22.73;80.00;66.67;72.73
Contrôleur;5;6;5;400.00;333.33;400.00;20.00;16.67;20.00;64.00;53.33;64.00
```

### 2. Export CSV Indices
```csv
INDICES D'ADEQUATION
Indicateur;Valeur;Statut
Calculé vs Actuel;85%;red
Recommandé vs Actuel;94%;orange
Recommandé vs Calculé;90%;orange
```

### 3. Export PNG Graphiques
- Utilise `canvas.toDataURL()` pour exporter chaque graphique
- Nom de fichier: `chart_{type}_{date}.png`

## Composants React

### 1. `IndiceCard`
- Affiche un indice avec sa couleur
- Props: `title`, `value`, `color`
- Icône dynamique selon la valeur

### 2. `ResultsTable`
- Tableau avec 13 colonnes
- Ligne TOTAL en bas avec fond sombre
- Props: `positions`, `totals`, `averages`

### 3. `LegendCard`
- Affiche la légende des couleurs
- Carrés colorés + descriptions

### 4. `IndiceModal`
- Modal avec graphique en barres des indices
- Ligne seuil à 100%
- Props: `indices`, `onClose`, `getBadgeColor`

### 5. `ChartModal`
- Modal avec graphique comparatif (Actuel vs Recommandé)
- Bouton export PNG
- Props: `type` ('mois'|'jour'|'heure'), `positions`, `onClose`

## Instructions de Connexion SQL Server

1. **Configuration de la connexion**:
```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "mssql+pyodbc://user:password@server/database?driver=ODBC+Driver+17+for+SQL+Server"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

2. **Variables d'environnement** (`.env`):
```
DB_SERVER=your_server
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
DB_DRIVER=ODBC Driver 17 for SQL Server
```

3. **Installation des dépendances**:
```bash
pip install sqlalchemy pyodbc
```

## Notes Importantes

- ⚠️ **Ne pas modifier la logique de calcul** - Les formules doivent rester exactement comme spécifiées
- 🎨 **Couleurs des badges** - Respecter strictement les seuils (95-105 vert, 90-95/105-110 orange, reste rouge)
- 📊 **Graphiques** - Utiliser Chart.js avec les options spécifiées (légende en haut, rotation des labels)
- 💾 **Exports** - Format CSV avec séparateur `;` pour compatibilité Excel France
- 🔢 **Division par zéro** - Toujours vérifier `effectif > 0` avant division, sinon retourner 0
- 📈 **Ligne TOTAL** - Recalculer les moyennes avec le total des effectifs (fallback à 1 si total = 0)
