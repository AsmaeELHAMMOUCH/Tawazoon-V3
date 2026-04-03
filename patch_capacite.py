import os

file_path = 'backend/app/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    c = f.read()

# Imports
if 'from app.api.recommande_capacite import router as recommande_capacite_router' not in c:
    c = c.replace(
        'from app.api.comparaison_actuel_reco import router as comparaison_actuel_reco_router',
        'from app.api.comparaison_actuel_reco import router as comparaison_actuel_reco_router\nfrom app.api.recommande_capacite import router as recommande_capacite_router'
    )

# Routing
if 'app.include_router(recommande_capacite_router, prefix="/api")' not in c:
    c = c.replace(
        'app.include_router(comparaison_actuel_reco_router, prefix="/api")',
        'app.include_router(comparaison_actuel_reco_router, prefix="/api")\napp.include_router(recommande_capacite_router, prefix="/api")'
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(c)
