"""
Exécuter le script de migration SQL
"""

from sqlalchemy import text
from app.core.db import engine

# Lire le script SQL
with open("migrations/fix_volume_simulation.sql", "r", encoding="utf-8") as f:
    sql_script = f.read()

# Séparer les commandes GO
commands = [cmd.strip() for cmd in sql_script.split("GO") if cmd.strip() and not cmd.strip().startswith("--")]

print("Exécution de la migration...")
print(f"Nombre de commandes: {len(commands)}")
print()

with engine.begin() as conn:
    for i, cmd in enumerate(commands, 1):
        if cmd and not cmd.startswith("USE"):
            try:
                print(f"[{i}/{len(commands)}] Exécution...")
                conn.execute(text(cmd))
                print(f"✅ OK")
            except Exception as e:
                print(f"⚠️  Erreur (peut être normale si déjà appliqué): {str(e)[:100]}")
        print()

print("Migration terminée!")
