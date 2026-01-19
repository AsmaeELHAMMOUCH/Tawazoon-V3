# app/services/volume_mapper.py
"""
Service de mapping automatique des volumes UI vers les tâches.
Résout le volume annuel à appliquer à chaque tâche en fonction de :
- flux_id (Amana, CO, CR, E-Barkia, LRH)
- sens_id (Arrivée, Départ, Guichet)
- segment_id (GLOBAL, PART, PRO, DIST, AXES)
- nom_tache (pour distinguer Dépôt/Récup au guichet)
"""
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session
from app.schemas.volumes_ui import VolumesUIInput, VolumeSegmentInput, FluxVolumesInput
from app.models.db_models import Tache, Flux, VolumeSens, VolumeSegment


# Constantes pour le mapping
JOURS_OUVRES_AN = 264

# Mapping des codes flux (DB → clés UI)
FLUX_CODE_MAP = {
    "AMANA": "amana",
    "CO": "co",
    "CR": "cr",
    "EBARKIA": "ebarkia",
    "E-BARKIA": "ebarkia",
    "LRH": "lrh",
}

# Mapping des codes sens (DB → blocs UI)
SENS_CODE_MAP = {
    "ARRIVEE": "arrivee",
    "ARRIVÉE": "arrivee",
    "DEPART": "depart",
    "DÉPART": "depart",
    "GUICHET": "guichet",
}

# Mapping des codes segment (DB → colonnes UI)
SEGMENT_CODE_MAP = {
    "GLOBAL": "global_",
    "PART": "part",
    "PARTICULIER": "part",
    "PRO": "pro",
    "PROFESSIONNEL": "pro",
    "DIST": "dist",
    "DISTRIBUTION": "dist",
    "AXES": "axes",
}


class VolumeMapper:
    """
    Classe responsable du mapping des volumes UI vers les tâches.
    """
    
    def __init__(self, db: Session):
        self.db = db
        # Cache pour les codes de référence
        self._flux_cache: Dict[int, str] = {}
        self._sens_cache: Dict[int, str] = {}
        self._segment_cache: Dict[int, str] = {}
        self._load_reference_caches()
    
    def _load_reference_caches(self):
        """Charge les codes de référence en cache pour éviter les requêtes répétées."""
        # Charger tous les flux
        flux_list = self.db.query(Flux).all()
        for flux in flux_list:
            self._flux_cache[flux.id] = flux.code.upper().strip()
        
        # Charger tous les sens
        sens_list = self.db.query(VolumeSens).all()
        for sens in sens_list:
            self._sens_cache[sens.id] = sens.code.upper().strip()
        
        # Charger tous les segments
        segment_list = self.db.query(VolumeSegment).all()
        for segment in segment_list:
            self._segment_cache[segment.id] = segment.code.upper().strip()
    
    def get_flux_code(self, flux_id: Optional[int]) -> Optional[str]:
        """Récupère le code flux normalisé."""
        if flux_id is None:
            return None
        return self._flux_cache.get(flux_id)
    
    def get_sens_code(self, sens_id: Optional[int]) -> Optional[str]:
        """Récupère le code sens normalisé."""
        if sens_id is None:
            return None
        return self._sens_cache.get(sens_id)
    
    def get_segment_code(self, segment_id: Optional[int]) -> Optional[str]:
        """Récupère le code segment normalisé."""
        if segment_id is None:
            return None
        return self._segment_cache.get(segment_id)
    
    def _is_depot_task(self, nom_tache: str) -> bool:
        """Détermine si une tâche guichet est un dépôt."""
        nom_lower = nom_tache.lower()
        depot_keywords = ["dépôt", "depot", "déposer", "deposer"]
        return any(kw in nom_lower for kw in depot_keywords)
    
    def _is_recup_task(self, nom_tache: str) -> bool:
        """Détermine si une tâche guichet est une récupération."""
        nom_lower = nom_tache.lower()
        recup_keywords = ["récup", "recup", "récupération", "recuperation", "retrait"]
        return any(kw in recup_keywords for kw in recup_keywords)
    
    def _get_segment_volume(
        self,
        segment_volumes: Optional[VolumeSegmentInput],
        segment_code: str
    ) -> float:
        """Extrait le volume d'un segment donné."""
        if segment_volumes is None:
            return 0.0
        
        # Mapper le code segment vers l'attribut du modèle
        segment_attr = SEGMENT_CODE_MAP.get(segment_code.upper())
        if segment_attr is None:
            return 0.0
        
        value = getattr(segment_volumes, segment_attr, 0.0)
        return float(value or 0.0)
    
    def _get_flux_volumes(
        self,
        flux_volumes: Optional[FluxVolumesInput],
        flux_code: str
    ) -> Optional[VolumeSegmentInput]:
        """Récupère les volumes d'un flux donné."""
        if flux_volumes is None:
            return None
        
        # Mapper le code flux vers l'attribut du modèle
        flux_attr = FLUX_CODE_MAP.get(flux_code.upper())
        if flux_attr is None:
            return None
        
        return getattr(flux_volumes, flux_attr, None)
    
    def resolve_volume(
        self,
        tache: Tache,
        volumes_ui: VolumesUIInput
    ) -> Tuple[float, str]:
        """
        Résout le volume annuel à appliquer à une tâche donnée.
        
        Args:
            tache: La tâche pour laquelle résoudre le volume
            volumes_ui: Les volumes saisis dans l'UI
        
        Returns:
            Tuple (volume_annuel, source_ui_description)
        """
        # Récupérer les codes de référence
        flux_code = self.get_flux_code(tache.flux_id)
        sens_code = self.get_sens_code(tache.sens_id)
        segment_code = self.get_segment_code(tache.segment_id)
        
        # Si un des codes est manquant, on ne peut pas mapper
        if not flux_code or not sens_code or not segment_code:
            return 0.0, f"missing_codes(flux={flux_code}, sens={sens_code}, segment={segment_code})"
        
        # Normaliser les codes
        flux_code_norm = FLUX_CODE_MAP.get(flux_code.upper(), flux_code.lower())
        sens_code_norm = SENS_CODE_MAP.get(sens_code.upper(), sens_code.lower())
        segment_code_norm = segment_code.upper()
        
        # Cas spécial : GUICHET
        if sens_code_norm == "guichet":
            return self._resolve_guichet_volume(tache, volumes_ui, flux_code_norm, segment_code_norm)
        
        # Cas général : ARRIVÉE ou DÉPART
        return self._resolve_flux_volume(
            tache, volumes_ui, flux_code_norm, sens_code_norm, segment_code_norm
        )
    
    def _resolve_guichet_volume(
        self,
        tache: Tache,
        volumes_ui: VolumesUIInput,
        flux_code: str,
        segment_code: str
    ) -> Tuple[float, str]:
        """Résout le volume pour une tâche guichet (dépôt ou récup)."""
        if volumes_ui.guichet is None:
            return 0.0, "guichet.none"
        
        # Déterminer si c'est un dépôt ou une récup
        is_depot = self._is_depot_task(tache.nom_tache)
        is_recup = self._is_recup_task(tache.nom_tache)
        
        if is_depot:
            volume = float(volumes_ui.guichet.depot or 0.0)
            return volume, f"guichet.depot({volume})"
        elif is_recup:
            volume = float(volumes_ui.guichet.recup or 0.0)
            return volume, f"guichet.recup({volume})"
        else:
            # Si on ne peut pas déterminer, on prend la somme (ou 0)
            # Vous pouvez ajuster cette logique selon vos besoins
            return 0.0, f"guichet.unknown_task({tache.nom_tache})"
    
    def _resolve_flux_volume(
        self,
        tache: Tache,
        volumes_ui: VolumesUIInput,
        flux_code: str,
        sens_code: str,
        segment_code: str
    ) -> Tuple[float, str]:
        """Résout le volume pour une tâche flux arrivée ou départ."""
        # Sélectionner le bloc (arrivée ou départ)
        if sens_code == "arrivee":
            flux_volumes = volumes_ui.flux_arrivee
            bloc_name = "flux_arrivee"
        elif sens_code == "depart":
            flux_volumes = volumes_ui.flux_depart
            bloc_name = "flux_depart"
        else:
            return 0.0, f"unknown_sens({sens_code})"
        
        # Récupérer les volumes du flux
        segment_volumes = self._get_flux_volumes(flux_volumes, flux_code)
        if segment_volumes is None:
            return 0.0, f"{bloc_name}.{flux_code}.none"
        
        # Récupérer le volume du segment
        volume = self._get_segment_volume(segment_volumes, segment_code)
        source = f"{bloc_name}.{flux_code}.{segment_code.lower()}({volume})"
        
        return volume, source
    
    def resolve_volume_jour(
        self,
        tache: Tache,
        volumes_ui: VolumesUIInput
    ) -> Tuple[float, str]:
        """
        Résout le volume/jour à appliquer à une tâche.
        
        Returns:
            Tuple (volume_jour, source_ui_description)
        """
        volume_annuel, source = self.resolve_volume(tache, volumes_ui)
        volume_jour = volume_annuel / volumes_ui.nb_jours_ouvres_an if volume_annuel > 0 else 0.0
        return volume_jour, source


def create_volume_mapper(db: Session) -> VolumeMapper:
    """Factory function pour créer un VolumeMapper."""
    return VolumeMapper(db)
