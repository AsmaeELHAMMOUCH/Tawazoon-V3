# app/services/cndp_config.py

"""
Configuration des règles de calcul pour le CNDP.
Associe chaque nom de tâche à :
1. Sa source de volume ("IMPORT", "EXPORT")
2. Ses facteurs d'application ("pct_ed", "pct_sac", "pct_retenue", "pct_echantillon")
3. Sa conversion d'unité ("div_sac" pour diviser par le ratio colis/sac)
"""

CNDP_TASK_MAPPING = {
    # --- IMPORT / RECEPTION ---
    "rception sacs": { "source": "IMPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" }, # réception sacs
    "Chargement des sacs au niveau chariot": { "source": "IMPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "Pointage des lots sur CP146": { "source": "IMPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "pointage des sacs par la douane": { "source": "IMPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "Prsentation des lots  la douane": { "source": "IMPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" }, # Présentation des lots à la douane
    "Validation des lots  (Main lev Douane ) sur IPS": { "source": "IMPORT", "factors": [], "unit_conversion": "" }, # Sacs = 100% donc pas de conversion divisée
    
    # --- IMPORT / COLIS ---
    "Extracton et envoi electronique du fichier import en masse  CNA": { "source": "IMPORT", "factors": ["pct_ed"] }, 
    "Saisie donnes sur  CN23 ( Par Lot) et Edition du Cp 146": { "source": "IMPORT", "factors": ["pct_ed"] },
    "Saisie et modification Poids": { "source": "IMPORT", "factors": ["pct_ed"] },
    "Taxation": { "source": "IMPORT", "factors": ["pct_ed"] },
    "Validation": { "source": "IMPORT", "factors": ["pct_ed"] },
    "Contrle Taxation (ETA CP 146)": { "source": "IMPORT", "factors": ["pct_ed"] },
    "Contrle via apllication (scann vs envoy SMI)": { "source": "IMPORT", "factors": ["pct_ed"] },
    "vrification des lots (mains leves) sur IPS": { "source": "IMPORT", "factors": ["pct_ed"] },

    # --- IMPORT / RETENUE & DOUANE ---
    "Saisi retenue": { "source": "IMPORT", "factors": ["pct_retenue"] },
    "Contrle Douanier et rensignement des fiches dounires et CP146": { "source": "IMPORT", "factors": ["pct_retenue"] },
    "inscription des Motif de Rtention": { "source": "IMPORT", "factors": ["pct_retenue"] },
    "Validation CP146": { "source": "IMPORT", "factors": ["pct_retenue"] },

    # --- EXPORT / DEPART ---
    "rception des sacs arrivs Maroc Export": { "source": "EXPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" }, # Export mais réception sacs départ ?
    "chant poids colis export": { "source": "EXPORT", "factors": [] },
    "contrle poids colis export": { "source": "EXPORT", "factors": [] },
    "Conrle physique des colis export": { "source": "EXPORT", "factors": [] },
    "saisi des donnes CDS": { "source": "EXPORT", "factors": [] },
    "Saisi des lots": { "source": "EXPORT", "factors": [] },
    "Cration Dpeche": { "source": "EXPORT", "factors": [] },
    "Cration depeches  (CP87/CN38/Part 115)": { "source": "EXPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "formation depeches export (CP87/CN38/Part 115)": { "source": "EXPORT", "factors": [] },
    "dtachement CN23": { "source": "EXPORT", "factors": [] }, # Check si sac ou colis
    "dtachement CN23 export": { "source": "EXPORT", "factors": [] },
    "Edition Documents ( CN23 )": { "source": "EXPORT", "factors": [] }, 
    "Edition Document ( CN 38)": { "source": "EXPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "Edition Document ( CP 87)": { "source": "EXPORT", "factors": ["pct_sac"], "unit_conversion": "div_sac" },
    "Gneration fichier en masse": { "source": "EXPORT", "factors": [] },
    "Vrification document": { "source": "EXPORT", "factors": [] },
    "Vrification document export": { "source": "EXPORT", "factors": [] },
    "Vrification Donnes": { "source": "EXPORT", "factors": [] },
    "Scan send": { "source": "EXPORT", "factors": [] },
    "pointage et verification de contrle douanier": { "source": "EXPORT", "factors": [] },
    "Insertion fiche de liquidation": { "source": "EXPORT", "factors": [] }, 
    "Sortie Douane": { "source": "EXPORT", "factors": [] },
}

def get_task_config(task_name: str):
    """
    Récupère la configuration pour une tâche donnée.
    Match exact ou partiel (fallback).
    """
    if task_name in CNDP_TASK_MAPPING:
        return CNDP_TASK_MAPPING[task_name]
    
    # Fallback si encodage corrigé ou espaces différents
    # On normalise un peu (remove accents/weird chars ?) Non, on tente contains
    for key, conf in CNDP_TASK_MAPPING.items():
        # Matching basique si le nom DB contient la clé config (ou inversement)
        if key in task_name or task_name in key:
             return conf
             
    # Fallback par mots clés génériques (Safety net)
    name_lower = task_name.lower()
    source = "EXPORT" if ("export" in name_lower or "dpart" in name_lower or "depart" in name_lower) else "IMPORT"
    factors = []
    unit_conv = None
    
    if "retenue" in name_lower or "rtention" in name_lower:
        factors.append("pct_retenue")
    elif "echantillon" in name_lower or "visite" in name_lower:
        factors.append("pct_echantillon")
    elif "sac" in name_lower and "hors" not in name_lower:
        factors.append("pct_sac")
        unit_conv = "div_sac"
    elif "ed" in name_lower.split() or "hors sac" in name_lower or "colis" in name_lower:
         if source == "IMPORT": # ED/Hors Sac c'est souvent Import
            factors.append("pct_ed")

    return {
        "source": source,
        "factors": factors,
        "unit_conversion": unit_conv
    }
