# app/schemas/volumes_ui.py
"""
Schémas Pydantic pour la saisie des volumes UI (Page Intervenant)
Structure : Flux Arrivée / Guichet / Flux Départ
"""
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class VolumeSegmentInput(BaseModel):
    """Volumes par segment (GLOBAL, PART, PRO, DIST, AXES)"""
    global_: Optional[float] = Field(default=0.0, alias="GLOBAL")
    part: Optional[float] = Field(default=0.0, alias="PART")
    pro: Optional[float] = Field(default=0.0, alias="PRO")
    dist: Optional[float] = Field(default=0.0, alias="DIST")
    axes: Optional[float] = Field(default=0.0, alias="AXES")

    class Config:
        populate_by_name = True


class FluxVolumesInput(BaseModel):
    """Volumes pour tous les flux (Amana, CO, CR, E-Barkia, LRH)"""
    amana: Optional[VolumeSegmentInput] = None
    co: Optional[VolumeSegmentInput] = None
    cr: Optional[VolumeSegmentInput] = None
    ebarkia: Optional[VolumeSegmentInput] = None
    lrh: Optional[VolumeSegmentInput] = None


class GuichetVolumesInput(BaseModel):
    """Volumes Guichet : Dépôt et Récupération"""
    depot: Optional[float] = Field(default=0.0, alias="DEPOT")
    recup: Optional[float] = Field(default=0.0, alias="RECUP")

    class Config:
        populate_by_name = True


class VolumeItem(BaseModel):
    """Structure item volume pour liste dynamique"""
    flux: str
    sens: str
    segment: str
    volume: float

    class Config:
        frozen = True # immutable pour etre hashable si besoin


class VolumesUIInput(BaseModel):
    """
    Structure complète des volumes UI saisis par l'utilisateur.
    Tous les volumes sont ANNUELS et seront convertis en volumes/jour (÷ 264).
    """
    # 🆕 Support du format liste plate (nouveau format)
    volumes_flux: Optional[List[VolumeItem]] = Field(default_factory=list)

    # ----------- ANCIENS PARAMETRES (Garder pour compatibilite ?) -----------
    # Flux Arrivée
    flux_arrivee: Optional[FluxVolumesInput] = Field(default_factory=FluxVolumesInput)
    
    # Guichet
    guichet: Optional[GuichetVolumesInput] = Field(default_factory=GuichetVolumesInput)
    
    # Flux Départ
    flux_depart: Optional[FluxVolumesInput] = Field(default_factory=FluxVolumesInput)
    
    # Paramètres de conversion dynamiques
    colis_amana_par_sac: float = Field(default=5.0, description="Nb colis Amana par sac")
    courriers_par_sac: float = Field(default=4500.0, description="Nb courriers par sac (legacy)")
    courriers_co_par_sac: float = Field(default=4500.0, description="Nb courriers CO par sac")
    courriers_cr_par_sac: float = Field(default=500.0, description="Nb courriers CR par caisson")
    cr_par_caisson: float = Field(default=500.0, description="Nb courriers CR par caisson (pour règle CR Arrivé)")
    colis_par_collecte: float = Field(default=1.0, description="Nb colis par collecte")
    
    # 🆕 Paramètres de répartition Axes vs Distribution
    pct_axes_arrivee: float = Field(default=0.40, ge=0.0, le=1.0, description="% Axes Arrivée (0.40 = 40%)")
    pct_axes_depart: float = Field(default=0.30, ge=0.0, le=1.0, description="% Axes Départ (0.30 = 30%)")
    
    # 🆕 Paramètres additionnels (ED, Collecte, Complexité, CNDP)
    ed_percent: float = Field(default=0.0, description="% ED (En Dehors)")
    pct_retenue: float = Field(default=1.0, description="% Retenue")
    pct_echantillon: float = Field(default=5.0, description="% échantillon")
    pct_sac: float = Field(default=60.0, description="% SAC")
    pct_collecte: float = Field(default=5.0, description="% Collecte")
    taux_complexite: float = Field(default=1.0, description="Coefficient Complexité Circulation (Facteur)")

    nature_geo: float = Field(default=1.0, description="Coefficient Complexité Géographique")
    pct_retour: float = Field(default=0.0, description="% Retour (Retour info facteur etc.)")
    pct_international: float = Field(default=0.0, description="% International")
    pct_national: float = Field(default=0.0, description="% National")
    pct_marche_ordinaire: float = Field(default=0.0, description="% Marché Ordinaire (Non-AMANA)")
    
    # 🆕 Paramètres spécifiques CCI (Center ID 1952)
    # Single-value fields (backward compatibility for non-CCI centres)
    nbr_courrier_liasse: Optional[float] = Field(default=50.0, description="Nombre de courriers par liasse (CCI)")
    pct_retour: Optional[float] = Field(default=0.0, description="Pourcentage de retour (CCI)")
    
    # 🆕 CO/CR-specific fields (Centre 1952 only)
    courriers_co_par_sac: Optional[float] = Field(default=2500.0, description="Nombre de courriers CO par sac")
    courriers_cr_par_sac: Optional[float] = Field(default=500.0, description="Nombre de courriers CR par sac")
    nb_courrier_liasse_co: Optional[float] = Field(default=500.0, description="Nombre de courriers CO par liasse")
    nb_courrier_liasse_cr: Optional[float] = Field(default=500.0, description="Nombre de courriers CR par liasse")
    pct_retour_co: Optional[float] = Field(default=1.0, description="Pourcentage de retour CO")
    pct_retour_cr: Optional[float] = Field(default=1.0, description="Pourcentage de retour CR")
    annotes_co: Optional[float] = Field(default=0.0, description="Pourcentage d'annotés CO")
    annotes_cr: Optional[float] = Field(default=0.0, description="Pourcentage d'annotés CR")
    pct_reclam_co: Optional[float] = Field(default=0.0, description="Pourcentage de réclamations CO")
    pct_reclam_cr: Optional[float] = Field(default=0.0, description="Pourcentage de réclamations CR")

    
    # Nombre de jours ouvrés par an (fixe, configurable)
    nb_jours_ouvres_an: int = Field(default=264, description="Nombre de jours ouvrés par an")

    class Config:
        populate_by_name = True


class VolumeTaskMapping(BaseModel):
    """
    Résultat du mapping pour une tâche donnée.
    Utilisé pour le debug et la traçabilité.
    """
    tache_id: int
    nom_tache: str
    flux_code: Optional[str] = None
    sens_code: Optional[str] = None
    segment_code: Optional[str] = None
    volume_annuel: float
    volume_jour: float
    source_ui: str  # Description de la source UI utilisée (ex: "flux_arrivee.amana.global")
