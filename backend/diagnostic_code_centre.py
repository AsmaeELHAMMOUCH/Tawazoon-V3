"""
Script de diagnostic pour identifier le problème code_centre
"""
import pyodbc
import os

# Configuration de connexion (à adapter selon votre environnement)
conn_str = os.getenv("DATABASE_URL", "")

if not conn_str:
    print("❌ DATABASE_URL non défini. Veuillez configurer la variable d'environnement.")
    print("Exemple: DRIVER={ODBC Driver 17 for SQL Server};SERVER=...;DATABASE=...;UID=...;PWD=...")
    exit(1)

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("✅ Connexion à la base de données réussie\n")
    
    # 1. Vérifier les colonnes de la table taches
    print("=" * 60)
    print("COLONNES DE LA TABLE dbo.taches")
    print("=" * 60)
    
    cursor.execute("""
        SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' 
          AND TABLE_NAME = 'taches'
        ORDER BY ORDINAL_POSITION
    """)
    
    columns = cursor.fetchall()
    if columns:
        for col in columns:
            print(f"  - {col.COLUMN_NAME:30} {col.DATA_TYPE:15} NULL={col.IS_NULLABLE}")
    else:
        print("  ⚠️  Aucune colonne trouvée (la table n'existe peut-être pas)")
    
    # 2. Vérifier si code_centre existe
    print("\n" + "=" * 60)
    print("RECHERCHE DE 'code_centre'")
    print("=" * 60)
    
    cursor.execute("""
        SELECT 
            TABLE_NAME,
            COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = 'dbo' 
          AND COLUMN_NAME LIKE '%code_centre%'
    """)
    
    code_centre_refs = cursor.fetchall()
    if code_centre_refs:
        print("  ⚠️  Colonnes 'code_centre' trouvées :")
        for ref in code_centre_refs:
            print(f"     - {ref.TABLE_NAME}.{ref.COLUMN_NAME}")
    else:
        print("  ✅ Aucune colonne 'code_centre' trouvée dans le schéma")
    
    # 3. Vérifier les vues qui pourraient référencer code_centre
    print("\n" + "=" * 60)
    print("VUES UTILISANT 'code_centre'")
    print("=" * 60)
    
    cursor.execute("""
        SELECT 
            TABLE_NAME,
            VIEW_DEFINITION
        FROM INFORMATION_SCHEMA.VIEWS
        WHERE TABLE_SCHEMA = 'dbo'
          AND VIEW_DEFINITION LIKE '%code_centre%'
    """)
    
    views = cursor.fetchall()
    if views:
        print("  ⚠️  Vues référençant 'code_centre' :")
        for view in views:
            print(f"     - {view.TABLE_NAME}")
    else:
        print("  ✅ Aucune vue ne référence 'code_centre'")
    
    # 4. Test de la requête problématique
    print("\n" + "=" * 60)
    print("TEST DE LA REQUÊTE CORRIGÉE")
    print("=" * 60)
    
    try:
        cursor.execute("""
            SELECT TOP 1
                t.id, t.nom_tache, t.phase, t.unite_mesure, t.moyenne_min, 
                t.centre_poste_id, t.poste_id
            FROM dbo.taches t
        """)
        result = cursor.fetchone()
        if result:
            print("  ✅ Requête SELECT explicite fonctionne")
            print(f"     Exemple: {result.nom_tache}")
        else:
            print("  ⚠️  Table vide")
    except Exception as e:
        print(f"  ❌ Erreur: {e}")
    
    conn.close()
    print("\n" + "=" * 60)
    print("DIAGNOSTIC TERMINÉ")
    print("=" * 60)
    
except Exception as e:
    print(f"❌ Erreur de connexion: {e}")
    print("\nVérifiez que DATABASE_URL est correctement configuré.")
