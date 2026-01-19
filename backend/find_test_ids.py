"""
Script pour trouver les IDs nécessaires pour le test de comparaison.
"""

from app.core.db import SessionLocal
from app.models.db_models import CentrePoste, Centre, Poste, Tache
from sqlalchemy import func

print("Connexion à la base de données...")
db = SessionLocal()


print("\nRecherche d'un centre/poste avec des tâches...")

# Requête SQLAlchemy
result = db.query(
    CentrePoste.id.label('centre_poste_id'),
    Centre.id.label('centre_id'),
    Centre.label.label('centre_label'),
    Poste.id.label('poste_id'),
    Poste.label.label('poste_label'),
    func.count(Tache.id).label('nb_taches')
).join(
    Centre, CentrePoste.centre_id == Centre.id
).join(
    Poste, CentrePoste.poste_id == Poste.id
).outerjoin(
    Tache, Tache.centre_poste_id == CentrePoste.id
).group_by(
    CentrePoste.id, Centre.id, Centre.label, Poste.id, Poste.label
).having(
    func.count(Tache.id) > 0
).order_by(
    func.count(Tache.id).desc()
).first()

if result:
    print(f"\n{'='*80}")
    print(f"CENTRE/POSTE TROUVÉ")
    print(f"{'='*80}")
    print(f"Centre ID:        {result.centre_id}")
    print(f"Centre Label:     {result.centre_label}")
    print(f"Poste ID:         {result.poste_id}")
    print(f"Poste Label:      {result.poste_label}")
    print(f"Centre/Poste ID:  {result.centre_poste_id}")
    print(f"Nombre de tâches: {result.nb_taches}")
    print(f"{'='*80}")
    
    print(f"\n✅ Utilisez ces valeurs dans test_compare_simulations.py:")
    print(f"   centre_poste_id = {result.centre_poste_id}")
    print(f"   centre_id = {result.centre_id}")
    
    # Vérifier combien de postes a ce centre
    nb_postes = db.query(CentrePoste).filter(
        CentrePoste.centre_id == result.centre_id
    ).count()
    
    print(f"\n📊 Informations supplémentaires:")
    print(f"   - Ce centre a {nb_postes} poste(s)")
    
    if nb_postes == 1:
        print(f"   ⚠️  Ce centre n'a qu'un seul poste")
        print(f"       → Les résultats Intervenant et Centre devraient être IDENTIQUES")
    else:
        print(f"   ℹ️  Ce centre a plusieurs postes")
        print(f"       → Le résultat Centre sera la SOMME de tous les postes")
        print(f"       → Le résultat Intervenant sera pour UN SEUL poste")
else:
    print("\n❌ Aucun centre/poste trouvé avec des tâches!")

db.close()
