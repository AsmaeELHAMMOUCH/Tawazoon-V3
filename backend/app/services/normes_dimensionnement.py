from sqlalchemy.orm import Session
from sqlalchemy import text

def get_normes_dimensionnement(db: Session):
    """
    Récupère les normes de dimensionnement (tâches) avec leurs temps unitaires.
    Exclut les métiers 'client', 'agence', 'chef service'.
    Trie par id_metier.
    Normalise les minutes/secondes pour l'affichage.
    """
    query = text("""
        SELECT t.nom_tache, m.nom_metier, m.intitule_rh, t.minutes_tache, t.secondes_tache, t.unite
        FROM tache t
        JOIN metier m ON t.id_metier = m.id_metier
        WHERE LOWER(m.nom_metier) NOT IN ('client', 'agence', 'chef service')
        ORDER BY m.id_metier
    """)
    result = db.execute(query).fetchall()

    rows = []
    for row in result:
        nom_tache, nom_metier, intitule_rh, minutes, secondes, unite = row

        # Normalisation identique au code PyQt5 fourni
        minutes = int(minutes) if minutes else 0
        secondes = float(secondes) if secondes else 0.0
        
        # Total en secondes
        total_seconds = int(minutes * 60 + secondes)

        # Recalcul minutes/secondes normalisées
        minutes_normalisees = total_seconds // 60
        secondes_normalisees = total_seconds % 60

        rows.append({
            "activite": nom_tache,
            "responsable": nom_metier,
            "intitule_rh": intitule_rh,
            "minutes": str(minutes_normalisees),
            "secondes": str(int(secondes_normalisees)), # Cast en int pour affichage propre "30" au lieu de "30.0" (sauf si besoin float, mais le prompt dit "str(int(...))")
            "unite": unite
        })

    return rows
