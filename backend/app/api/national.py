# backend/app/api/national.py

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.core.db import get_db
from app.schemas.direction_sim import VolumeMatriciel, GlobalParams, CentreSimulationData
from app.services.national_simulation_service import process_national_simulation

router = APIRouter(tags=["national"])
print(">>> [NATIONAL] Loading National API Router...")

class NationalSimRequest(BaseModel):
    """Request pour simulation nationale"""
    mode: str = Field("data_driven", pattern="^(actuel|recommande|database|data_driven)$")
    volumes_matriciels: List[VolumeMatriciel] = []
    centres_data: List[CentreSimulationData] = []  # 🆕 Support Structure hiérarchique avec params
    global_params: GlobalParams = GlobalParams()

class NationalSimResponse(BaseModel):
    """Response de simulation nationale"""
    centres_simules: int
    directions: List[dict]
    regionsData: List[dict] = [] # Ajout pour compatibilité frontend initial load
    centres: List[dict] = []  # 🆕 Détail par centre
    postes: List[dict] = []   # 🆕 Agrégation par poste
    all_centre_postes: List[dict] = [] # 🆕 Liste Granulaire (flat) pour modales détail
    kpis_nationaux: dict

@router.post("/simulation/national", response_model=NationalSimResponse)
def simulate_national(payload: NationalSimRequest, db: Session = Depends(get_db)):
    """
    Lance une simulation nationale avec volumes matriciels.
    
    Args:
        payload: Contient les volumes matriciels et les paramètres globaux
        db: Session de base de données
    
    Returns:
        Résultats agrégés par direction et au niveau national
    """
    print(f"🌍 API: REÇU POST /simulation/national")
    print(f"📦 API: {len(payload.volumes_matriciels)} volumes matriciels")
    
    result = process_national_simulation(
        db=db,
        volumes_matriciels=payload.volumes_matriciels,
        centres_data=payload.centres_data,
        global_params={
            "productivite": payload.global_params.productivite,
            "heures_par_jour": payload.global_params.heures_par_jour,
            "idle_minutes": payload.global_params.idle_minutes,
            "taux_complexite": payload.global_params.taux_complexite,
            "nature_geo": payload.global_params.nature_geo
        }
    )
    
    return result

from fastapi.responses import StreamingResponse
import io
import openpyxl
from openpyxl.utils import get_column_letter

@router.get("/simulation/template/centres")
def get_centres_template(db: Session = Depends(get_db)):
    """
    Génère un template Excel par Centre avec structure Bandoeng (Wizard Step 3).
    """
    from app.api.batch_simulation import _build_template_workbook
    
    # 1. Récupérer tous les Centres
    centres = db.execute(text("""
        SELECT c.id, c.label, r.label as region_label 
        FROM dbo.centres c 
        LEFT JOIN dbo.regions r ON c.region_id = r.id 
        ORDER BY r.label, c.label
    """)).mappings().all()
    
    wb = _build_template_workbook([dict(c) for c in centres])
    
    # Output
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="Template_National_Bandoeng.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/simulation/national/structure", response_model=NationalSimResponse)
def get_national_structure(db: Session = Depends(get_db)):
    """
    Récupère la structure actuelle (Organisation & Effectifs Actuels) sans simulation.
    Permet d'afficher les tableaux 'Consolidé Centre' avec les données de la base.
    """
    print("🌍 [NATIONAL] Récupération de la structure actuelle (DB)...")
    
    # 1. Récupérer tous les CENTRES avec Direction et Catégorie
    sql_centres = """
        SELECT 
            c.id, 
            c.label, 
            c.direction_id, 
            d.label as direction_label, 
            cat.label as categorie_label
        FROM dbo.centres c
        LEFT JOIN dbo.directions d ON d.id = c.direction_id
        LEFT JOIN dbo.categories cat ON cat.id = c.categorie_id
    """
    centres_rows = db.execute(text(sql_centres)).mappings().all()
    
    # 2. Récupérer les EFFECTIFS ACTUELS par Centre et Poste
    sql_postes = """
        SELECT 
            cp.centre_id,
            c.label as centre_label,
            cp.effectif_actuel,
            p.id as poste_id,
            p.label as poste_label,
            p.type_poste
        FROM dbo.centre_postes cp
        JOIN dbo.postes p ON p.id = cp.poste_id
        JOIN dbo.centres c ON c.id = cp.centre_id
        WHERE cp.effectif_actuel > 0
    """
    postes_rows = db.execute(text(sql_postes)).mappings().all()
    print(f"🔍 [DEBUG NATIONAL] Postes récupérés: {len(postes_rows)}")
    if len(postes_rows) > 0:
        print(f"Exemple poste row: {dict(postes_rows[0])}")
    
    # Organisation des effectifs
    centre_stats = {} # centre_id -> {etp_actuel: 0.0, moi:0, mod:0, aps:0}
    postes_agg = {}   # poste_label -> {etp_actuel: 0.0, type: ...}

    # 🆕 Liste granulaire pour les modales
    all_centre_postes = []

    for p in postes_rows:
        cid = p['centre_id']
        etp = float(p['effectif_actuel'] or 0)
        lbl = p['poste_label']
        typ = str(p['type_poste'] or "").strip().upper()
        
        # Aggregation Centre
        if cid not in centre_stats: 
            centre_stats[cid] = {"etp_actuel": 0.0, "moi": 0.0, "mod": 0.0, "aps": 0.0}
        
        centre_stats[cid]["etp_actuel"] += etp
        
        if typ == 'MOI': centre_stats[cid]["moi"] += etp
        elif typ == 'MOD': centre_stats[cid]["mod"] += etp
        elif typ == 'APS': centre_stats[cid]["aps"] += etp
        
        # Aggregation Poste National
        if lbl not in postes_agg:
            postes_agg[lbl] = {"etp_actuel": 0.0, "type": typ}
        postes_agg[lbl]["etp_actuel"] += etp

        # 🆕 Ajout à la liste granulaire
        all_centre_postes.append({
            "centre_id": cid,
            "centre_label": p['centre_label'],
            "poste_id": p['poste_id'],
            "label": lbl, # 'label' pour compatibilité Modal
            "type_poste": typ,
            "effectif_actuel": etp,
            "etp_calcule": 0.0, # Pas de simu ici
            "ecart": -etp
        })

    # 3. Construction de la liste CENTRES
    centres_output = []
    directions_agg = {}
    
    total_etp_actuel_national = 0.0
    
    for c in centres_rows:
        cid = c['id']
        stats = centre_stats.get(cid, {"etp_actuel": 0.0, "moi": 0.0, "mod": 0.0, "aps": 0.0})
        etp_actuel = stats["etp_actuel"]
        
        total_etp_actuel_national += etp_actuel
        
        did = c['direction_id']
        dlabel = c['direction_label'] or "Sans Direction"
        
        # Agg Direction
        if did not in directions_agg:
            directions_agg[did] = {
                "id": did, "label": dlabel, 
                "etp_actuel": 0.0, "centres": 0,
                "act_moi": 0.0, "act_mod": 0.0, "act_aps": 0.0
            }
            
        directions_agg[did]["etp_actuel"] += etp_actuel
        directions_agg[did]["act_moi"] += stats["moi"]
        directions_agg[did]["act_mod"] += stats["mod"]
        directions_agg[did]["act_aps"] += stats["aps"]
        directions_agg[did]["centres"] += 1
        
        centres_output.append({
            "centre_id": cid,
            "nom": c['label'],
            "direction_id": did,
            "direction_label": dlabel,
            "typologie": c['categorie_label'] or "Non défini",
            "etp_actuel": etp_actuel,
            "act_moi": stats["moi"],
            "act_mod": stats["mod"],
            "act_aps": stats["aps"],
            "etp_calcule": 0.0, 
            "ecart": -etp_actuel 
        })
        
    centres_output.sort(key=lambda x: x['nom'])

    # 4. Construction de la liste POSTES
    postes_output = []
    for lbl, data in postes_agg.items():
        postes_output.append({
            "poste_label": lbl,
            "type_poste": data["type"],
            "etp_actuel": data["etp_actuel"],
            "etp_calcule": 0.0,
            "ecart": -data["etp_actuel"]
        })
    postes_output.sort(key=lambda x: x['poste_label'])
    
    # 5. Construction de la liste DIRECTIONS & REGIONS DATA
    directions_output = []
    regions_data_output = []
    
    for did, data in directions_agg.items():
        # Standard Sim Output format
        directions_output.append({
            "direction_id": did,
            "direction_label": data["label"],
            "etp_total": 0.0, # Recommande
            "heures_totales": 0.0,
            "etp_actuel": data["etp_actuel"],
            "act_moi": data["act_moi"],
            "act_mod": data["act_mod"],
            "act_aps": data["act_aps"]
        })
        
        # Frontend Initial Load structure (uses 'nom', 'etpActuelMoi'...)
        regions_data_output.append({
            "id": did,
            "nom": data["label"],
            "code": f"DIR_{did}",
            "centres": data["centres"],
            "etpActuel": data["etp_actuel"],
            "etpRecommande": 0.0,
            "etpActuelMoi": data["act_moi"],
            "etpActuelMod": data["act_mod"],
            "etpActuelAps": data["act_aps"],
            "tauxOccupation": 0
        }) 
    
    return {
        "centres_simules": 0,
        "directions": directions_output,
        "regionsData": regions_data_output,
        "centres": centres_output,
        "postes": postes_output,
        "all_centre_postes": all_centre_postes, # 🆕
        "kpis_nationaux": {
            "etp_total": 0.0,
            "etpActuelTotal": total_etp_actuel_national,
            "heures_totales": 0.0,
            "centres_total": len(centres_output),
            "directions_total": len(directions_output)
        }
    }
