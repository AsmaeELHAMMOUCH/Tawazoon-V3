# app/api/views.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from app.core.db import get_db
from app.services.simulation import calculer_simulation, calculer_heures_nettes
from pydantic import BaseModel

router = APIRouter(tags=["views"])

class PosteETP(BaseModel):
    """Résultat ETP pour un poste donné"""
    poste_id: int
    poste_label: str
    type_poste: Optional[str] = None
    effectif_actuel: int
    etp_calcule: float
    etp_arrondi: int
    ecart: int  # etp_arrondi - effectif_actuel
    total_heures: float

class VueIntervenantResponse(BaseModel):
    """Réponse complète pour la vue Intervenant"""
    centre_id: int
    centre_label: str
    postes: list[PosteETP]
    total_etp_calcule: float
    total_etp_arrondi: int
    total_effectif_actuel: int
    total_ecart: int


@router.get("/vue-intervenant", response_model=VueIntervenantResponse)
def get_vue_intervenant(
    centre_id: int = Query(..., description="ID du centre"),
    sacs: float = Query(0, ge=0),
    colis: float = Query(0, ge=0),
    scelle: float = Query(0, ge=0),
    courrier_ordinaire: float = Query(0, ge=0, description="Volume annuel CO"),
    courrier_recommande: float = Query(0, ge=0, description="Volume annuel CR"),
    ebarkia: float = Query(0, ge=0, description="Volume annuel"),
    lrh: float = Query(0, ge=0, description="Volume annuel"),
    amana: float = Query(0, ge=0, description="Volume annuel"),
    productivite: float = Query(100, ge=0, le=100),
    heures_net: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    """
    Calcule les ETP nécessaires pour TOUS les postes d'un centre donné.
    
    Cette vue agrège automatiquement les calculs pour chaque poste
    en fonction des volumes et de la productivité.
    
    Paramètres:
    - centre_id: ID du centre à analyser
    - sacs, colis, scelle: volumes JOURNALIERS
    - courrier_ordinaire, courrier_recommande, etc.: volumes ANNUELS
    - productivite: taux de productivité (%)
    - heures_net: heures nettes par jour (optionnel, calculé si absent)
    """
    
    try:
        # 1️⃣ Récupérer les infos du centre
        centre_row = db.execute(
            text("SELECT id, label FROM dbo.centres WHERE id = :centre_id"),
            {"centre_id": centre_id}
        ).mappings().first()
        
        if not centre_row:
            raise HTTPException(status_code=404, detail=f"Centre {centre_id} introuvable")
        
        centre_label = centre_row["label"]
        
        # 2️⃣ Récupérer tous les postes du centre avec effectifs actuels
        postes_rows = db.execute(text("""
            SELECT 
                p.id as poste_id,
                p.label as poste_label,
                p.type_poste,
                COALESCE(cp.effectif_actuel, 0) as effectif_actuel
            FROM dbo.centre_postes cp
            INNER JOIN dbo.postes p ON p.id = cp.poste_id
            WHERE cp.centre_id = :centre_id
            ORDER BY p.label
        """), {"centre_id": centre_id}).mappings().all()
        
        if not postes_rows:
            # Aucun poste configuré pour ce centre
            return VueIntervenantResponse(
                centre_id=centre_id,
                centre_label=centre_label,
                postes=[],
                total_etp_calcule=0.0,
                total_etp_arrondi=0,
                total_effectif_actuel=0,
                total_ecart=0
            )
        
        # 3️⃣ Convertir volumes annuels → mensuels
        volumes_mensuels = {
            "courrier_ordinaire": courrier_ordinaire / 12,
            "courrier_recommande": courrier_recommande / 12,
            "ebarkia": ebarkia / 12,
            "lrh": lrh / 12,
            "amana": amana / 12,
        }
        
        # 4️⃣ Calculer les heures nettes
        heures_net_calculees = calculer_heures_nettes(productivite, heures_net)
        
        # 5️⃣ Pour chaque poste, récupérer ses tâches et calculer l'ETP
        postes_etp = []
        total_etp_calcule = 0.0
        total_etp_arrondi = 0
        total_effectif_actuel = 0
        
        for poste in postes_rows:
            poste_id = poste["poste_id"]
            
            # Récupérer les tâches de ce poste dans ce centre
            taches_rows = db.execute(text("""
                SELECT 
                    t.id,
                    t.nom_tache,
                    t.phase,
                    t.unite_mesure,
                    t.moyenne_min,
                    t.centre_poste_id
                FROM dbo.taches t
                INNER JOIN dbo.centre_postes cp ON cp.id = t.centre_poste_id
                WHERE cp.centre_id = :centre_id 
                  AND cp.poste_id = :poste_id
                ORDER BY t.nom_tache
            """), {
                "centre_id": centre_id,
                "poste_id": poste_id
            }).mappings().all()
            
            taches = [dict(r) for r in taches_rows]
            
            # Simuler pour ce poste
            volumes_input = {
                "sacs": sacs,
                "colis": colis,
                "scelle": scelle
            }
            
            resultat = calculer_simulation(
                taches=taches,
                volumes=volumes_input,
                productivite=productivite,
                heures_net_input=heures_net,
                volumes_mensuels=volumes_mensuels
            )
            
            effectif_actuel = int(poste["effectif_actuel"])
            ecart = resultat.fte_arrondi - effectif_actuel
            
            postes_etp.append(PosteETP(
                poste_id=poste_id,
                poste_label=poste["poste_label"],
                type_poste=poste["type_poste"],
                effectif_actuel=effectif_actuel,
                etp_calcule=resultat.fte_calcule,
                etp_arrondi=resultat.fte_arrondi,
                ecart=ecart,
                total_heures=resultat.total_heures
            ))
            
            # Totaux
            total_etp_calcule += resultat.fte_calcule
            total_etp_arrondi += resultat.fte_arrondi
            total_effectif_actuel += effectif_actuel
        
        total_ecart = total_etp_arrondi - total_effectif_actuel
        
        return VueIntervenantResponse(
            centre_id=centre_id,
            centre_label=centre_label,
            postes=postes_etp,
            total_etp_calcule=round(total_etp_calcule, 2),
            total_etp_arrondi=total_etp_arrondi,
            total_effectif_actuel=total_effectif_actuel,
            total_ecart=total_ecart
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du calcul de la vue intervenant: {str(e)}"
        )


@router.get("/vue-intervenant/export")
def export_vue_intervenant(
    centre_id: int = Query(...),
    sacs: float = Query(0, ge=0),
    colis: float = Query(0, ge=0),
    scelle: float = Query(0, ge=0),
    courrier_ordinaire: float = Query(0, ge=0),
    courrier_recommande: float = Query(0, ge=0),
    ebarkia: float = Query(0, ge=0),
    lrh: float = Query(0, ge=0),
    amana: float = Query(0, ge=0),
    productivite: float = Query(100, ge=0, le=100),
    heures_net: Optional[float] = Query(None, ge=0),
    db: Session = Depends(get_db)
):
    """
    Version export CSV de la vue intervenant.
    Retourne les mêmes données au format CSV pour export Excel.
    """
    # Réutiliser la même logique
    result = get_vue_intervenant(
        centre_id=centre_id,
        sacs=sacs,
        colis=colis,
        scelle=scelle,
        courrier_ordinaire=courrier_ordinaire,
        courrier_recommande=courrier_recommande,
        ebarkia=ebarkia,
        lrh=lrh,
        amana=amana,
        productivite=productivite,
        heures_net=heures_net,
        db=db
    )
    
    # Construire le CSV
    import io
    output = io.StringIO()
    output.write("Poste,Type,Effectif Actuel,ETP Calculé,ETP Arrondi,Écart,Total Heures\n")
    
    for poste in result.postes:
        output.write(f'"{poste.poste_label}",')
        output.write(f'"{poste.type_poste or "N/A"}",')
        output.write(f"{poste.effectif_actuel},")
        output.write(f"{poste.etp_calcule},")
        output.write(f"{poste.etp_arrondi},")
        output.write(f"{poste.ecart},")
        output.write(f"{poste.total_heures}\n")
    
    output.write(f"\nTOTAL,,{result.total_effectif_actuel},{result.total_etp_calcule},{result.total_etp_arrondi},{result.total_ecart}\n")
    
    from fastapi.responses import StreamingResponse
    output.seek(0)
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=vue_intervenant_centre_{centre_id}.csv"
        }
    )