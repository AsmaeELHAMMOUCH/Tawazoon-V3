from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response, Form
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.bandoeng_engine import (
    run_bandoeng_simulation,
    BandoengInputVolumes,
    BandoengParameters,
    BandoengSimulationResult,
    BandoengTaskResult
)

from openpyxl import load_workbook, Workbook
import io
from copy import deepcopy

router = APIRouter(prefix="/bandoeng", tags=["Bandoeng Simulation"])

# Constants
BANDOENG_CENTRE_ID = 1942


# --- Pydantic Models for API ---

class BandoengVolumesIn(BaseModel):
    amana_import: float = 0.0
    amana_export: float = 0.0
    courrier_ordinaire_import: float = 0.0
    courrier_ordinaire_export: float = 0.0
    courrier_recommande_import: float = 0.0
    courrier_recommande_export: float = 0.0
    gare_import: float = 0.0
    gare_export: float = 0.0
    presse_import: float = 0.0
    presse_export: float = 0.0
    grid_values: dict = {}

class BandoengParamsIn(BaseModel):
    pct_sac: float = 60.0
    colis_amana_par_canva_sac: float = 35.0
    nbr_co_sac: float = 350.0
    nbr_cr_sac: float = 400.0
    coeff_circ: float = 1.0
    coeff_geo: float = 1.0
    pct_retour: float = 0.0
    pct_collecte: float = 0.0
    pct_axes: float = 0.0
    pct_local: float = 0.0
    pct_international: float = 0.0
    pct_national: float = 0.0
    pct_march_ordinaire: float = 0.0
    productivite: float = 100.0
    idle_minutes: float = 0.0
    ratio_trieur: float = 1200.0
    ratio_preparateur: float = 1000.0
    ratio_magasinier: float = 800.0
    shift: int = 1
    pct_mois: Optional[float] = None

class BandoengSimulateRequest(BaseModel):
    centre_id: int = 1942
    poste_code: Optional[str] = None
    volumes: BandoengVolumesIn
    params: BandoengParamsIn

class BandoengTaskOut(BaseModel):
    task_id: int
    task_name: str
    unite_mesure: str
    produit: str
    moyenne_min: float
    volume_source: str
    volume_annuel: float
    volume_journalier: float
    heures_calculees: float
    formule: str
    famille: str
    responsable: str
    moy_sec: float
    centre_poste_id: int
    phase: Optional[str] = None

class BandoengSimulateResponse(BaseModel):
    tasks: List[BandoengTaskOut]
    total_heures: float
    heures_net_jour: float
    fte_calcule: float
    fte_arrondi: int
    besoin_trieur: float
    besoin_preparateur: float
    besoin_magasinier: float
    total_ressources_humaines: float
    ressources_par_poste: dict = {}

@router.post("/simulate", response_model=BandoengSimulateResponse)
def simulate_bandoeng(request: BandoengSimulateRequest, db: Session = Depends(get_db)):
    try:
        # Convert Request to Engine Inputs
        volumes = BandoengInputVolumes(
            amana_import=request.volumes.amana_import,
            amana_export=request.volumes.amana_export,
            courrier_ordinaire_import=request.volumes.courrier_ordinaire_import,
            courrier_ordinaire_export=request.volumes.courrier_ordinaire_export,
            courrier_recommande_import=request.volumes.courrier_recommande_import,
            courrier_recommande_export=request.volumes.courrier_recommande_export,
            gare_import=request.volumes.gare_import,
            gare_export=request.volumes.gare_export,
            presse_import=request.volumes.presse_import,
            presse_export=request.volumes.presse_export,
            grid_values=request.volumes.grid_values
        )
        
        params = BandoengParameters(
            pct_sac=request.params.pct_sac,
            colis_amana_par_canva_sac=request.params.colis_amana_par_canva_sac,
            nbr_co_sac=request.params.nbr_co_sac,
            nbr_cr_sac=request.params.nbr_cr_sac,
            coeff_circ=request.params.coeff_circ,
            coeff_geo=request.params.coeff_geo,
            pct_retour=request.params.pct_retour,
            pct_collecte=request.params.pct_collecte,
            pct_axes=request.params.pct_axes,
            pct_local=request.params.pct_local,
            pct_international=request.params.pct_international,
            pct_national=request.params.pct_national,
            pct_march_ordinaire=request.params.pct_march_ordinaire,
            productivite=request.params.productivite,
            idle_minutes=request.params.idle_minutes,
            ratio_trieur=request.params.ratio_trieur,
            ratio_preparateur=request.params.ratio_preparateur,
            ratio_magasinier=request.params.ratio_magasinier,
            shift=request.params.shift,
            pct_mois=request.params.pct_mois
        )
        
        print(f"DEBUG: simulate_bandoeng received grid_values: {request.volumes.grid_values}")
        result = run_bandoeng_simulation(db, request.centre_id, volumes, params, request.poste_code)
        
        # Convert Engine Result to Response
        tasks_out = [
            BandoengTaskOut(
                task_id=t.task_id,
                task_name=t.task_name,
                unite_mesure=t.unite_mesure,
                produit=t.produit,
                moyenne_min=t.moyenne_min,
                volume_source=t.volume_source,
                volume_annuel=t.volume_annuel,
                volume_journalier=t.volume_journalier,
                heures_calculees=t.heures_calculees,
                formule=t.formule,
                famille=t.famille,
                responsable=t.responsable,
                moy_sec=t.moy_sec,
                centre_poste_id=t.centre_poste_id,
                phase=t.phase
            ) for t in result.tasks
        ]
        
        return BandoengSimulateResponse(
            tasks=tasks_out,
            total_heures=result.total_heures,
            heures_net_jour=result.heures_net_jour,
            fte_calcule=result.fte_calcule,
            fte_arrondi=result.fte_arrondi,
            besoin_trieur=result.besoin_trieur,
            besoin_preparateur=result.besoin_preparateur,
            besoin_magasinier=result.besoin_magasinier,
            total_ressources_humaines=result.total_ressources_humaines,
            ressources_par_poste=result.ressources_par_poste
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- NEW: Simplified Endpoint for VueIntervenant ---
class SimplifiedBandoengRequest(BaseModel):
    """
    Structure simplifiée pour VueIntervenant.
    Accepte directement grid_values et parameters au lieu de volumes/params imbriqués.
    """
    centre_id: int = Field(default=1942, description="ID du centre")
    poste_code: Optional[str] = Field(default=None, description="Code du poste (optionnel)")
    grid_values: dict = Field(default_factory=dict, description="Valeurs de la grille Bandoeng")
    parameters: dict = Field(default_factory=dict, description="Paramètres de simulation")

@router.post("/simulate-bandoeng", response_model=BandoengSimulateResponse)
def simulate_bandoeng_direct(request: SimplifiedBandoengRequest, db: Session = Depends(get_db)):
    """
    Endpoint simplifié utilisant bandoeng_engine.py directement.
    Conçu pour VueIntervenant avec une structure de requête plus simple.
    """
    try:
        # 1. Construire BandoengInputVolumes avec grid_values
        volumes = BandoengInputVolumes(
            grid_values=request.grid_values,
            # Champs legacy non utilisés avec grid_values
            amana_import=0.0,
            amana_export=0.0,
            courrier_ordinaire_import=0.0,
            courrier_ordinaire_export=0.0,
            courrier_recommande_import=0.0,
            courrier_recommande_export=0.0,
            gare_import=0.0,
            gare_export=0.0,
            presse_import=0.0,
            presse_export=0.0
        )
        
        # 2. Construire BandoengParameters depuis le dict parameters
        p = request.parameters
        params = BandoengParameters(
            pct_sac=p.get('pct_sac', 60.0),
            colis_amana_par_canva_sac=p.get('colis_amana_par_canva_sac', 35.0),
            nbr_co_sac=p.get('nbr_co_sac', 350.0),
            nbr_cr_sac=p.get('nbr_cr_sac', 400.0),
            coeff_circ=p.get('taux_complexite', 1.0),  # Alias frontend
            coeff_geo=p.get('nature_geo', 1.0),  # Alias frontend
            pct_retour=p.get('pct_retour', 0.0),
            pct_collecte=p.get('pct_collecte', 0.0),
            pct_axes=p.get('pct_axes_arrivee', 0.0),  # Alias frontend
            pct_local=p.get('pct_axes_depart', 0.0),  # Alias frontend
            pct_international=p.get('pct_international', 0.0),
            pct_national=p.get('pct_national', 100.0),
            pct_march_ordinaire=p.get('pct_marche_ordinaire', 0.0),
            productivite=p.get('productivite', 100.0),
            idle_minutes=p.get('idle_minutes', 0.0),
            ratio_trieur=p.get('ratio_trieur', 1200.0),
            ratio_preparateur=p.get('ratio_preparateur', 1000.0),
            ratio_magasinier=p.get('ratio_magasinier', 800.0),
            shift=int(p.get('shift', 1)),
            pct_mois=p.get('pct_mois')
        )
        
        print(f"DEBUG: simulate_bandoeng_direct received grid_values: {request.grid_values}")
        # 3. Appeler run_bandoeng_simulation
        result = run_bandoeng_simulation(
            db=db,
            centre_id=request.centre_id,
            volumes=volumes,
            params=params,
            poste_code=request.poste_code
        )
        
        # 4. Convertir le résultat
        tasks_out = [
            BandoengTaskOut(
                task_id=t.task_id,
                task_name=t.task_name,
                unite_mesure=t.unite_mesure,
                produit=t.produit,
                moyenne_min=t.moyenne_min,
                volume_source=t.volume_source,
                volume_annuel=t.volume_annuel,
                volume_journalier=t.volume_journalier,
                heures_calculees=t.heures_calculees,
                formule=t.formule,
                famille=t.famille,
                responsable=t.responsable,
                moy_sec=t.moy_sec,
                centre_poste_id=t.centre_poste_id,
                phase=t.phase
            ) for t in result.tasks
        ]
        
        return BandoengSimulateResponse(
            tasks=tasks_out,
            total_heures=result.total_heures,
            heures_net_jour=result.heures_net_jour,
            fte_calcule=result.fte_calcule,
            fte_arrondi=result.fte_arrondi,
            besoin_trieur=result.besoin_trieur,
            besoin_preparateur=result.besoin_preparateur,
            besoin_magasinier=result.besoin_magasinier,
            total_ressources_humaines=result.total_ressources_humaines,
            ressources_par_poste=result.ressources_par_poste
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur simulation Bandoeng: {str(e)}")



# --- New Response Model for Centre Details ---
class BandoengCentreDetailsResponse(BaseModel):
    centre_id: int
    centre_name: str
    aps: float
    moi_global: int
    mod_global: int
    total_global: int

# Importer les modèles nécessaires
from app.models.db_models import Centre, CentrePoste, Poste, Tache, HierarchiePostes

@router.get("/centre-details/{centre_id}", response_model=BandoengCentreDetailsResponse)
def get_bandoeng_centre_details(centre_id: int, db: Session = Depends(get_db)):
    """
    Récupère les détails d'effectif du centre (APS, MOI, MOD) depuis la base de données.
    """
    try:
        # 1. Récupérer le Centre
        centre = db.query(Centre).filter(Centre.id == centre_id).first()
        if not centre:
            raise HTTPException(status_code=404, detail="Centre introuvable")
        
        # 2. Récupérer les CentrePostes et leurs types
        centre_postes = (
            db.query(CentrePoste, Poste.type_poste, Poste.label, Poste.Code)
            .join(Poste, CentrePoste.code_resp == Poste.Code)
            .filter(CentrePoste.centre_id == centre_id)
            .all()
        )
        
        moi_sum = 0
        mod_sum = 0
        
        for cp, type_poste, poste_label, poste_code in centre_postes:
            eff = cp.effectif_actuel or 0
            # Logique MOI : Type 'MOI', 'INDIRECT', 'STRUCTURE' ou label contenant 'RESPONSABLE'
            t = (type_poste or "").upper()
            l = (poste_label or "").upper()
            is_moi = t in ["MOI", "INDIRECT", "STRUCTURE"] or "RESPONSABLE" in l
            
            if is_moi:
                moi_sum += eff
            else:
                mod_sum += eff
                
        return BandoengCentreDetailsResponse(
            centre_id=centre.id,
            centre_name=centre.label,
            aps=centre.aps or 0.0,
            moi_global=moi_sum,
            mod_global=mod_sum,
            total_global=moi_sum + mod_sum
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


from sqlalchemy import func

@router.get("/postes")
def list_bandoeng_postes(
    centre_id: int = Query(..., description="ID du centre (Bandoeng = 1942)"),
    db: Session = Depends(get_db),
):
    """
    Retourne la liste des postes pour le dropdown Bandoeng.
    Utilise la jointure via code_resp pour garantir la cohérence avec les autres modules si nécessaire.
    """
    try:
        # Initialisation de la requête : Jointure via code_resp
        query = (
            db.query(
                Poste.id,
                CentrePoste.id.label("centre_poste_id"),
                Poste.label,
                Poste.type_poste,
                func.coalesce(CentrePoste.effectif_actuel, 0).label("effectif_actuel"),
                CentrePoste.code_resp.label("code"), # ✅ Use CentrePoste code as the source of truth
                HierarchiePostes.label.label("categorie"), # ✅ AJOUT: Catégorie Hiérarchique
                Poste.hie_poste.label("raw_hie") # ✅ DEBUG: Raw hierarchy code
            )
            .join(CentrePoste, CentrePoste.code_resp == Poste.Code) # ✅ Join via Code as requested
            .outerjoin(HierarchiePostes, Poste.hie_poste == HierarchiePostes.code) # ✅ Join avec la table Hiérarchie via Code
            .filter(CentrePoste.centre_id == centre_id)
            .order_by(Poste.label)
        )
         
        rows = query.all()

        result = []
        if rows:
            print(f"DEBUG BACKEND: First row category = {rows[0].categorie} | Raw Hie = {rows[0].raw_hie}")
            
        for r in rows:
             result.append({
                "id": r.id,
                "centre_poste_id": r.centre_poste_id,
                "label": r.label,
                "type_poste": r.type_poste,
                "effectif_actuel": r.effectif_actuel,
                "code": r.code,
                "code": r.code,
                "categorie": r.categorie, # ✅ Return category to frontend
                "raw_hie": r.raw_hie # ✅ Debug info
            })
            
        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des postes Bandoeng: {str(e)}")

@router.post("/import/volume-grid")

async def import_bandoeng_volumes(file: UploadFile = File(...)):
    try:
        content = await file.read()
        wb = load_workbook(filename=io.BytesIO(content), data_only=True)
        ws = wb.active
        
        grid_values = {
            "amana": {
                "depot": {
                    "gc": {"global": 0, "local": 0, "axes": 0},
                    "part": {"global": 0, "local": 0, "axes": 0}
                },
                "recu": {
                    "gc": {"global": 0, "local": 0, "axes": 0},
                    "part": {"global": 0, "local": 0, "axes": 0}
                }
            },
            "cr": {
                "med": {"global": 0, "local": 0, "axes": 0},
                "arrive": {"global": 0, "local": 0, "axes": 0}
            },
            "co": {
                "med": {"global": 0, "local": 0, "axes": 0},
                "arrive": {"global": 0, "local": 0, "axes": 0}
            },
            "ebarkia": {
                "med": 0,
                "arrive": 0
            },
            "lrh": {
                "med": 0,
                "arrive": 0
            }
        }
        
        def val(row, col):
            v = ws.cell(row=row, column=col).value
            if v is None: return 0
            if isinstance(v, (int, float)): return v
            try:
                # Handle strings with spaces/commas (thousand separators or decimals)
                cleaned = str(v).replace(' ', '').replace('\u00a0', '').replace('\u202f', '').replace(',', '.')
                return float(cleaned)
            except: 
                return 0

        # --- AMANA (Row 4) ---
        r = 4
        # Depot GC
        grid_values["amana"]["depot"]["gc"]["global"] = val(r, 2)
        grid_values["amana"]["depot"]["gc"]["local"] = val(r, 3)
        grid_values["amana"]["depot"]["gc"]["axes"] = val(r, 4)
        # Depot Part
        grid_values["amana"]["depot"]["part"]["global"] = val(r, 5)
        grid_values["amana"]["depot"]["part"]["local"] = val(r, 6)
        grid_values["amana"]["depot"]["part"]["axes"] = val(r, 7)
        # Recu GC
        grid_values["amana"]["recu"]["gc"]["global"] = val(r, 8)
        grid_values["amana"]["recu"]["gc"]["local"] = val(r, 9)
        grid_values["amana"]["recu"]["gc"]["axes"] = val(r, 10)
        # Recu Part
        grid_values["amana"]["recu"]["part"]["global"] = val(r, 11)
        grid_values["amana"]["recu"]["part"]["local"] = val(r, 12)
        grid_values["amana"]["recu"]["part"]["axes"] = val(r, 13)

        # --- CR and CO (Row 9=CR, 10=CO) ---
        rows_map = {9: "cr", 10: "co"}
        
        for r_idx, key in rows_map.items():
            # MED
            grid_values[key]["med"]["global"] = val(r_idx, 2)
            grid_values[key]["med"]["local"] = val(r_idx, 3)
            grid_values[key]["med"]["axes"] = val(r_idx, 4)
            # ARRIVE
            grid_values[key]["arrive"]["global"] = val(r_idx, 5)
            grid_values[key]["arrive"]["local"] = val(r_idx, 6)
            grid_values[key]["arrive"]["axes"] = val(r_idx, 7)
        
        # --- El Barkia (Row 13: simple MED and Arrivé) ---
        grid_values["ebarkia"]["med"] = val(13, 2)
        grid_values["ebarkia"]["arrive"] = val(13, 3)
        
        # --- LRH (Row 14: simple MED and Arrivé) ---
        grid_values["lrh"]["med"] = val(14, 2)
        grid_values["lrh"]["arrive"] = val(14, 3)

        return grid_values

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erreur lors de la lecture du fichier Excel: {str(e)}")


@router.get("/import-template")
def get_import_template():
    wb = Workbook()
    ws = wb.active
    ws.title = "Modele Import"
    headers = [
        "Nom de tâche", "Produit", "Famille", "Unité de mesure", 
        "Responsable 1", "Responsable 2", "Temps_min", "Temps_sec"
    ]
    ws.append(headers)
    
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modele_import_taches.xlsx"}
    )

@router.post("/import/tasks")
async def import_bandoeng_tasks(
    centre_id: int = Query(..., description="ID du centre cible"),
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Importe les tâches depuis un fichier Excel et met à jour les responsables et chronos.
    Gère la duplication des tâches si deux responsables sont fournis.
    """
    try:
        content = await file.read()
        wb = load_workbook(filename=io.BytesIO(content), data_only=True)
        ws = wb.active
        
        updated_count = 0
        duplicate_count = 0
        not_found_count = 0
        errors = []
        
        # --- Helper: Resolve CentrePoste ---
        from app.models.db_models import Tache, CentrePoste, Poste
        from sqlalchemy import func, or_
        
        def resolve_centre_poste(session, c_id, resp_name):
            if not resp_name:
                return None
                
            l_resp = resp_name.strip()
            # 1. Trouver le Poste (Exact match on Label, slightly loose)
            # Utilisation de ILIKE via func.lower pour etre insensible a la casse
            poste = session.query(Poste).filter(func.lower(func.trim(Poste.label)) == l_resp.lower()).first()
            
            if not poste:
                return None
            
            # 2. Trouver CentrePoste via Code
            if not poste.Code:
                # Fallback: try finding by ID if possible? No, user said "par le nom... table postes... code de postes... table centres_poste (code_resp)"
                return None
                
            cp = (
                session.query(CentrePoste)
                .filter(CentrePoste.centre_id == c_id)
                .filter(CentrePoste.code_resp == poste.Code)
                .first()
            )
            
            if cp:
                return cp.id
            else:
                # 3. Créer CentrePoste
                new_cp = CentrePoste(
                    centre_id=c_id,
                    poste_id=poste.id,  # "poste_id le meme de la ligne trouvée"
                    code_resp=poste.Code,
                    effectif_actuel=0
                )
                session.add(new_cp)
                session.flush()
                return new_cp.id

        # --- Main Loop ---
        for row_idx in range(2, ws.max_row + 1):
            # Lecture
            nom_tache = str(ws.cell(row=row_idx, column=1).value or "").strip()
            produit = str(ws.cell(row=row_idx, column=2).value or "").strip()
            famille = str(ws.cell(row=row_idx, column=3).value or "").strip()
            unite_mesure = str(ws.cell(row=row_idx, column=4).value or "").strip()
            
            resp1_raw = str(ws.cell(row=row_idx, column=5).value or "").strip()
            resp2_raw = str(ws.cell(row=row_idx, column=6).value or "").strip()
            
            t_min_raw = ws.cell(row=row_idx, column=7).value
            t_sec_raw = ws.cell(row=row_idx, column=8).value
            
            if not nom_tache or nom_tache == "None":
                continue
                
            # Parsing Temps
            try:
                t_min = float(str(t_min_raw).replace(',', '.')) if t_min_raw is not None else 0.0
                t_sec = float(str(t_sec_raw).replace(',', '.')) if t_sec_raw is not None else 0.0
            except:
                errors.append(f"Ligne {row_idx}: Temps invalide")
                continue
                
            # Recherche Tâches
            q = (
                db.query(Tache)
                .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
                .filter(CentrePoste.centre_id == centre_id)
                .filter(func.lower(func.trim(Tache.nom_tache)) == nom_tache.lower())
                .filter(func.lower(func.trim(Tache.famille_uo)) == famille.lower())
                .filter(func.lower(func.trim(Tache.unite_mesure)) == unite_mesure.lower())
            )
            
            # Filtre Produit (LIKE)
            if produit:
                 q = q.filter(func.lower(Tache.produit).like(f"%{produit.lower()}%"))
            
            found_tasks = q.all()
            
            if not found_tasks:
                not_found_count += 1
                errors.append(f"Avertissement Ligne {row_idx}: Tâche '{nom_tache}' (Fam: {famille}, Unit: {unite_mesure}) non trouvée.")
                continue
                
            # --- Application Règles ---
            cp_id_1 = resolve_centre_poste(db, centre_id, resp1_raw) if resp1_raw else None
            # Pour resp2, on ne le cherche que si resp2_raw existe
            cp_id_2 = resolve_centre_poste(db, centre_id, resp2_raw) if resp2_raw else None
            
            # Cas A : Deux Responsables
            if resp1_raw and resp2_raw:
                if len(found_tasks) == 1:
                    # 1 seule tâche -> Update T1, Dupliquer T2
                    t1 = found_tasks[0]
                    
                    # Update T1
                    if cp_id_1: t1.centre_poste_id = cp_id_1
                    t1.moyenne_min = t_min
                    t1.moy_sec = t_sec
                    updated_count += 1
                    
                    # Create T2 (Duplicate)
                    if cp_id_2:
                        # On doit copier l'objet Tache. 
                        # SQLAlchemy ne supporte pas deepcopy directement sur les instances attachées facilement sans détacher.
                        # On crée une nouvelle instance manuellement
                        t2 = Tache(
                            centre_poste_id=cp_id_2,
                            nom_tache=t1.nom_tache,
                            famille_uo=t1.famille_uo,
                            phase=t1.phase,
                            unite_mesure=t1.unite_mesure,
                            etat=t1.etat,
                            produit=t1.produit,
                            base_calcul=t1.base_calcul,
                            flux_id=t1.flux_id,
                            sens_id=t1.sens_id,
                            segment_id=t1.segment_id,
                            moyenne_min=t_min,
                            moy_sec=t_sec
                        )
                        db.add(t2)
                        duplicate_count += 1
                    else:
                        errors.append(f"Ligne {row_idx}: Resp2 '{resp2_raw}' introuvable/création impossible. Duplication annulée.")
                
                elif len(found_tasks) >= 2:
                    # 2+ tâches -> Update T1 et T2
                    # Tâche 1 -> Resp 1
                    t1 = found_tasks[0]
                    if cp_id_1: t1.centre_poste_id = cp_id_1
                    t1.moyenne_min = t_min
                    t1.moy_sec = t_sec
                    updated_count += 1
                    
                    # Tâche 2 -> Resp 2
                    t2 = found_tasks[1]
                    if cp_id_2: t2.centre_poste_id = cp_id_2
                    t2.moyenne_min = t_min
                    t2.moy_sec = t_sec
                    updated_count += 1
                    
                    # Les autres ? (Si > 2) - Le plan dit "Mettre chrono à 0" pour les doublons en Cas B, mais pour Cas A "Update T1, Update T2". 
                    # On assume que les autres (T3...) ne sont pas touchés ou mis à 0?
                    # Dans le doute du commentaire "on modifie ni le chrono ni le responsable" qui s'appliquait avant modif,
                    # je vais appliquer la logique Cas B aux extras : Chrono 0
                    for t_extra in found_tasks[2:]:
                         t_extra.moyenne_min = 0
                         t_extra.moy_sec = 0

            # Cas B : Un Seul Responsable (Resp1)
            elif resp1_raw and not resp2_raw:
                if len(found_tasks) == 1:
                     # Simple update
                     t1 = found_tasks[0]
                     if cp_id_1: t1.centre_poste_id = cp_id_1
                     t1.moyenne_min = t_min
                     t1.moy_sec = t_sec
                     updated_count += 1
                
                elif len(found_tasks) >= 2:
                    # Règle modifiée : T1 -> Update Resp/Chrono, T2..TN -> Chrono=0
                    t1 = found_tasks[0]
                    if cp_id_1: t1.centre_poste_id = cp_id_1
                    t1.moyenne_min = t_min
                    t1.moy_sec = t_sec
                    updated_count += 1
                    
                    # Les autres -> Chrono 0
                    for t_other in found_tasks[1:]:
                        t_other.moyenne_min = 0
                        t_other.moy_sec = 0
                        # Pas de modif de responsable
            
            else:
                 # Aucun responsable fourni ? On met juste à jour le chrono ?
                 # Pas spécifié, on assume update chrono sur tous
                 for t in found_tasks:
                     t.moyenne_min = t_min
                     t.moy_sec = t_sec
                     updated_count += 1

        db.commit()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "duplicate_count": duplicate_count,
            "not_found_count": not_found_count,
            "errors": errors
        }

    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erreur import: {str(e)}")
