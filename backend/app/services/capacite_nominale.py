from sqlalchemy.orm import Session
from sqlalchemy import text

# Constantes strictes du cahier des charges
PARAM_JOUR_MINUTES = 480
PARAM_MOIS_JOURS = 22

# Dictionnaire strict des temps fixes (copie exacte)
TEMPS_FIXES = {
    "Chef Service": 0.00,
    "Chargé Réception dossier": 3.81,
    "Chargé dossier": 10.98,
    "Chargé saisie": 10.52,
    "Chargé Validation": 2.17,
    "Chargé production": 8.77,
    "Chargé envoi": 2.56,
    "Chargé archives": 1.80,
    "Chargé Numérisation": 1.49,
    "Chargé Stock": 0.00,
    "Chargé réclamation et reporting": 0.00,
    "Coordinateur Réseau": 0.00,
    "Chargé codes PIN": 2.00,
    "Chargé Contrôle": 0.00,
    "Détaché agence": 0.00
}

def fmt(value):
    """
    Formatage strict : 
    - si float entier (ex: 3.0), retour "3"
    - sinon string tel quel
    """
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)

def get_capacite_nominale_data(db: Session):
    """
    Récupère les postes via SQL, applique les temps fixes et calculs.
    Retourne {rows: [...], total: {...}}
    """
    # 1. Requête SQL
    query = text("""
        SELECT nom_metier
        FROM metier
        WHERE LOWER(nom_metier) NOT IN (
            'client','agence','chef service','chargé contrôle','chargé stock',
            'coordinateur réseau','détaché agence','chargé réclamation et reporting'
        )
        ORDER BY nom_metier
    """)
    result = db.execute(query).fetchall()

    rows = []
    total_temps = 0.0

    for r in result:
        poste = r[0] # nom_metier
        
        # 2. Récupération temps fixe (défaut 0)
        temps = TEMPS_FIXES.get(poste, 0.0)
        
        # 3. Calculs
        if temps > 0:
            # Dossiers / Jour
            dossiers_jour = round(PARAM_JOUR_MINUTES / temps, 2)
            # Dossiers / Heure (60 min hardcodé)
            dossiers_heure = round(60 / temps, 1)
            # Dossiers / Mois
            dossiers_mois = round(dossiers_jour * PARAM_MOIS_JOURS)
        else:
            dossiers_jour = ""
            dossiers_heure = ""
            dossiers_mois = ""

        # Agrégation Total Temps
        total_temps += temps

        # Construction ligne
        rows.append({
            "position": poste,
            "temps_par_dossier": fmt(temps) if temps != "" else "0", # Affichage tel quel (souvent float)
            "effectif_actuel": "", # Toujours vide
            "dossiers_mois": fmt(dossiers_mois),
            "dossiers_jour": fmt(dossiers_jour),
            "dossiers_heure": fmt(dossiers_heure)
        })

    # 4. Ligne Total
    total_row = {
        "position": "TOTAL",
        "temps_par_dossier": fmt(round(total_temps, 2)),
        "effectif_actuel": "",
        "dossiers_mois": "",
        "dossiers_jour": "",
        "dossiers_heure": ""
    }

    return {"rows": rows, "total": total_row}
