"""
Script de diagnostic simplifié utilisant SQLAlchemy
"""
import sys
sys.path.insert(0, "c:\\Users\\Aelhammouch\\simulateur-rh-V2\\backend")

from app.core.db import engine
from sqlalchemy import text, inspect

print("=" * 70)
print("DIAGNOSTIC SCHÉMA SQL SERVER")
print("=" * 70)

try:
    with engine.connect() as conn:
        # 1. Vérifier les colonnes de la table taches
        print("\n📋 COLONNES DE LA TABLE dbo.taches")
        print("-" * 70)
        
        result = conn.execute(text("""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' 
              AND TABLE_NAME = 'taches'
            ORDER BY ORDINAL_POSITION
        """))
        
        columns = result.fetchall()
        if columns:
            for col in columns:
                print(f"  • {col[0]:30} {col[1]:15} NULL={col[2]}")
        else:
            print("  ⚠️  Table 'taches' introuvable")
        
        # 2. Rechercher 'code_centre' partout
        print("\n" + "=" * 70)
        print("🔍 RECHERCHE DE 'code_centre' DANS LE SCHÉMA")
        print("-" * 70)
        
        result = conn.execute(text("""
            SELECT TABLE_NAME, COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'dbo' 
              AND COLUMN_NAME LIKE '%code_centre%'
        """))
        
        refs = result.fetchall()
        if refs:
            print("  ⚠️  Colonnes 'code_centre' trouvées :")
            for ref in refs:
                print(f"     - {ref[0]}.{ref[1]}")
        else:
            print("  ✅ Aucune colonne 'code_centre' dans le schéma")
        
        # 3. Tester la requête problématique
        print("\n" + "=" * 70)
        print("🧪 TEST DE LA REQUÊTE CORRIGÉE")
        print("-" * 70)
        
        try:
            result = conn.execute(text("""
                SELECT TOP 1
                    t.id, t.nom_tache, t.phase, t.unite_mesure, 
                    t.moyenne_min, t.centre_poste_id, t.poste_id
                FROM dbo.taches t
            """))
            row = result.fetchone()
            if row:
                print(f"  ✅ Requête SELECT explicite fonctionne")
                print(f"     Exemple: {row[1]}")
            else:
                print("  ⚠️  Table vide")
        except Exception as e:
            print(f"  ❌ Erreur: {e}")
        
        print("\n" + "=" * 70)
        print("✅ DIAGNOSTIC TERMINÉ")
        print("=" * 70)

except Exception as e:
    print(f"\n❌ ERREUR DE CONNEXION: {e}")
    import traceback
    traceback.print_exc()
