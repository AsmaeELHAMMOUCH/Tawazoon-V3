from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
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

from openpyxl import load_workbook
import io

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
    productivite: float = 100.0
    idle_minutes: float = 0.0
    ratio_trieur: float = 1200.0
    ratio_preparateur: float = 1000.0
    ratio_magasinier: float = 800.0
    shift: int = 1

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
            productivite=request.params.productivite,
            idle_minutes=request.params.idle_minutes,
            ratio_trieur=request.params.ratio_trieur,
            ratio_preparateur=request.params.ratio_preparateur,
            ratio_magasinier=request.params.ratio_magasinier,
            shift=request.params.shift
        )
        
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
                centre_poste_id=t.centre_poste_id
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
            total_ressources_humaines=result.total_ressources_humaines
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


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


@router.post("/import/tasks")
async def import_bandoeng_tasks(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Importe les tâches depuis un fichier Excel et met à jour les responsables et chronos.
    
    Logique:
    1. Recherche par: nom_tache, produit, famille_uo, unite_mesure, centre_id=1942
    2. Met à jour: moyenne_min, moy_sec (et potentiellement les responsables via centre_poste)
    """
    try:
        content = await file.read()
        wb = load_workbook(filename=io.BytesIO(content), data_only=True)
        ws = wb.active
        
        # Statistiques
        updated_count = 0
        not_found_count = 0
        errors = []
        
        # Parcourir les lignes (à partir de la ligne 4, après les en-têtes à la ligne 3)
        for row_idx in range(4, ws.max_row + 1):
            # Lire les valeurs et nettoyer les espaces
            nom_tache_raw = ws.cell(row=row_idx, column=1).value
            produit_raw = ws.cell(row=row_idx, column=2).value
            famille_raw = ws.cell(row=row_idx, column=3).value
            unite_mesure_raw = ws.cell(row=row_idx, column=4).value
            responsable_1_raw = ws.cell(row=row_idx, column=5).value
            responsable_2_raw = ws.cell(row=row_idx, column=6).value
            temps_min = ws.cell(row=row_idx, column=7).value
            temps_sec = ws.cell(row=row_idx, column=8).value
            
            # Nettoyer les espaces (début et fin)
            nom_tache = str(nom_tache_raw).strip() if nom_tache_raw else None
            produit = str(produit_raw).strip() if produit_raw else None
            famille = str(famille_raw).strip() if famille_raw else None
            unite_mesure = str(unite_mesure_raw).strip() if unite_mesure_raw else None
            responsable_1 = str(responsable_1_raw).strip() if responsable_1_raw else None
            responsable_2 = str(responsable_2_raw).strip() if responsable_2_raw else None
            
            # Ignorer les lignes vides
            if not nom_tache or nom_tache == "" or nom_tache == "None":
                continue
            
            # Convertir les temps en nombres (gérer virgule et point comme séparateur décimal)
            try:
                # Convertir en string et remplacer virgule par point si nécessaire
                if temps_min is not None:
                    temps_min_str = str(temps_min).replace(',', '.')
                    temps_min_val = float(temps_min_str)
                else:
                    temps_min_val = 0.0
                    
                if temps_sec is not None:
                    temps_sec_str = str(temps_sec).replace(',', '.')
                    temps_sec_val = float(temps_sec_str)
                else:
                    temps_sec_val = 0.0
                    
            except (ValueError, TypeError) as e:
                errors.append(f"Ligne {row_idx}: Temps invalide (min={temps_min}, sec={temps_sec}) - {str(e)}")
                continue
            
            # Stocker temps_min directement dans moyenne_min (sans conversion)
            moyenne_min_val = temps_min_val
            
            # Debug logging
            print(f"DEBUG Import - Ligne {row_idx}: temps_min={temps_min} -> moyenne_min={moyenne_min_val}, "
                  f"temps_sec={temps_sec} -> moy_sec={temps_sec_val}")
            
            # Rechercher la tâche dans la base
            # On doit joindre avec centre_poste pour filtrer par centre_id
            from app.models.db_models import Tache, CentrePoste, Poste
            from sqlalchemy import func
            
            query = (
                db.query(Tache)
                .join(CentrePoste, Tache.centre_poste_id == CentrePoste.id)
                .filter(CentrePoste.centre_id == BANDOENG_CENTRE_ID)
            )
            
            # Filtres sur la tâche (avec TRIM et LOWER pour maximiser les correspondances)
            if nom_tache:
                query = query.filter(func.lower(func.trim(Tache.nom_tache)) == nom_tache.lower())
            if produit:
                # Utilisation de ILIKE simulé par lower() + like pour compatibilité
                query = query.filter(func.lower(Tache.produit).like(f"%{produit.lower()}%"))
            if famille:
                query = query.filter(func.lower(func.trim(Tache.famille_uo)) == famille.lower())
            if unite_mesure:
                query = query.filter(func.lower(func.trim(Tache.unite_mesure)) == unite_mesure.lower())
            
            tasks = query.all()
            
            if not tasks:
                not_found_count += 1
                errors.append(
                    f"Ligne {row_idx}: Tâche non trouvée (nom={nom_tache}, produit={produit}, "
                    f"famille={famille}, unité={unite_mesure})"
                )
                continue
            
            # Mettre à jour toutes les tâches trouvées
            for task in tasks:
                task.moyenne_min = moyenne_min_val
                task.moy_sec = temps_sec_val
                
                # Mise à jour du responsable si fourni
                if responsable_1 and str(responsable_1).strip():
                    responsable_label = str(responsable_1).strip()
                    
                    # 1. Chercher ou créer le Poste (avec TRIM pour nettoyer les espaces)
                    poste = db.query(Poste).filter(func.trim(Poste.label) == responsable_label).first()
                    
                    if not poste:
                        errors.append(f"Ligne {row_idx}: Poste '{responsable_label}' introuvable. Mise à jour annulée.")
                        continue

                    if not poste.Code:
                        errors.append(f"Ligne {row_idx}: Poste '{responsable_label}' (ID: {poste.id}) n'a pas de Code. Impossible de lier par Code.")
                        continue

                    print(f"DEBUG: Poste '{responsable_label}' OK. ID={poste.id}, Code={poste.Code}")

                    # 2. Chercher ou créer le CentrePoste
                    centre_poste = (
                        db.query(CentrePoste)
                        .filter(CentrePoste.code_resp == poste.Code)
                        .filter(CentrePoste.centre_id == BANDOENG_CENTRE_ID)
                        .first()
                    )
                    
                    if centre_poste:
                        print(f"DEBUG: CentrePoste EXISTANT trouvé. ID={centre_poste.id}, CentreID={centre_poste.centre_id}, CodeResp={centre_poste.code_resp}")
                    else:
                        print(f"DEBUG: CentrePoste introuvable pour Code={poste.Code} et Centre={BANDOENG_CENTRE_ID}. Création...")
                        # Créer une nouvelle association centre-poste
                        centre_poste = CentrePoste(
                            centre_id=BANDOENG_CENTRE_ID,
                            poste_id=poste.id,
                            code_resp=poste.Code,
                            effectif_actuel=0
                        )
                        db.add(centre_poste)
                        db.flush()  # Pour obtenir l'ID
                        print(f"DEBUG: NOUVEAU CentrePoste créé. ID={centre_poste.id}, CentreID={centre_poste.centre_id} (Code: {poste.Code})")
                    
                    # 3. Mettre à jour le centre_poste_id de la tâche
                    old_cp_id = task.centre_poste_id
                    task.centre_poste_id = centre_poste.id
                    print(f"DEBUG: Tâche '{task.nom_tache}' mise à jour. Old CP_ID={old_cp_id} -> New CP_ID={centre_poste.id}")
                

            updated_count += len(tasks)
        
        # Commit des changements
        db.commit()
        
        return {
            "success": True,
            "updated_count": updated_count,
            "not_found_count": not_found_count,
            "errors": errors,
            "message": f"{updated_count} tâche(s) mise(s) à jour avec succès."
        }
        
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Erreur lors de l'importation: {str(e)}")

