# app/services/data_driven_engine.py
"""
Moteur de calcul 100% DATA-DRIVEN.
Aucune logique conditionnelle hardcodée.
Tout est piloté par les tables de référence.
"""
from typing import Dict, List, Optional, Tuple, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from app.models.db_models import Tache, CentrePoste, Flux, VolumeSens, VolumeSegment
from app.models.mapping_models import VolumeMappingRule, UniteConversionRule
from app.schemas.volumes_ui import VolumesUIInput


class DataDrivenEngine:
    """
    Moteur de calcul data-driven pour la simulation RH.
    
    Principes :
    1. Mapping automatique via table VolumeMappingRule
    2. Conversion d'unités via table UniteConversionRule
    3. Aucun if/else dans le code métier
    4. Scalable : nouveaux flux/sens/segments sans changer le code
    """
    
    def __init__(self, db: Session):
        self.db = db
        # Cache des règles de mapping
        self._mapping_rules: List[VolumeMappingRule] = []
        # Cache des règles de conversion
        self._conversion_rules: Dict[str, float] = {}
        # Cache des codes de référence
        self._flux_codes: Dict[int, str] = {}
        self._sens_codes: Dict[int, str] = {}
        self._segment_codes: Dict[int, str] = {}
        
        self._load_caches()
    
    def _load_caches(self):
        """Charge toutes les règles et référentiels en cache."""
        # Charger les règles de mapping (triées par priorité DESC)
        self._mapping_rules = (
            self.db.query(VolumeMappingRule)
            .order_by(VolumeMappingRule.priority.desc())
            .all()
        )
        
        # Charger les règles de conversion
        conversion_rules = self.db.query(UniteConversionRule).all()
        self._conversion_rules = {
            rule.unite_mesure.upper().strip(): rule.facteur_conversion
            for rule in conversion_rules
        }
        
        # Charger les codes de référence
        flux_list = self.db.query(Flux).all()
        self._flux_codes = {f.id: f.code.upper().strip() for f in flux_list}
        
        sens_list = self.db.query(VolumeSens).all()
        self._sens_codes = {s.id: s.code.upper().strip() for s in sens_list}
        
        segment_list = self.db.query(VolumeSegment).all()
        self._segment_codes = {seg.id: seg.code.upper().strip() for seg in segment_list}
    
    def find_matching_rule(
        self,
        tache: Tache
    ) -> Optional[VolumeMappingRule]:
        """
        Trouve la règle de mapping correspondant à une tâche.
        
        Logique de matching :
        - flux_id doit matcher (ou être NULL dans la règle = wildcard)
        - sens_id doit matcher (ou être NULL dans la règle = wildcard)
        - segment_id doit matcher (ou être NULL dans la règle = wildcard)
        - Si nom_tache_keyword est défini, il doit être présent dans nom_tache
        
        Retourne la règle avec la priorité la plus élevée.
        """
        for rule in self._mapping_rules:
            # Vérifier flux_id
            if rule.flux_id is not None and rule.flux_id != tache.flux_id:
                continue
            
            # Vérifier sens_id
            if rule.sens_id is not None and rule.sens_id != tache.sens_id:
                continue
            
            # Vérifier segment_id
            if rule.segment_id is not None and rule.segment_id != tache.segment_id:
                continue
            
            # Vérifier keyword dans nom_tache
            if rule.nom_tache_keyword:
                keyword_lower = rule.nom_tache_keyword.lower()
                nom_tache_lower = tache.nom_tache.lower()
                if keyword_lower not in nom_tache_lower:
                    continue
            
            # Règle trouvée !
            return rule
        
        return None
    
    def get_volume_from_ui_path(
        self,
        ui_path: str,
        volumes_ui: VolumesUIInput
    ) -> float:
        """
        Extrait le volume depuis la structure UI en utilisant le chemin.
        
        Exemple :
        - ui_path = "flux_arrivee.amana.global_"
        - Retourne volumes_ui.flux_arrivee.amana.global_
        
        Utilise la navigation par attributs pour éviter les if/else.
        """
        try:
            # Découper le chemin (ex: "flux_arrivee.amana.global_")
            parts = ui_path.split(".")
            
            # Naviguer dans la structure
            current = volumes_ui
            for part in parts:
                current = getattr(current, part, None)
                if current is None:
                    return 0.0
            
            # Si c'est un nombre, le retourner
            if isinstance(current, (int, float)):
                return float(current)
            
            return 0.0
        
        except (AttributeError, TypeError):
            return 0.0
    
    def get_conversion_factor(self, unite_mesure: str) -> float:
        """
        Récupère le facteur de conversion pour une unité de mesure.
        
        Si l'unité n'est pas dans la table, retourne 1.0 (pas de conversion).
        """
        unite_normalized = unite_mesure.upper().strip()
        return self._conversion_rules.get(unite_normalized, 1.0)
    
    def resolve_volume_for_task(
        self,
        tache: Tache,
        volumes_ui: VolumesUIInput,
        ed_percent: float = 0.0  # 🆕 Pourcentage "En Dehors"
    ) -> Tuple[float, float, float, str]:
        """
        Résout le volume applicable pour une tâche donnée.
        
        Returns:
            Tuple (volume_annuel, volume_jour, facteur_conversion, ui_path)
        
        Processus :
        1. Trouver la règle de mapping correspondante
        2. Extraire le volume UI via le chemin
        3. Appliquer le facteur de conversion d'unité
        4. Convertir en volume/jour
        """
        # 1. Trouver la règle de mapping
        rule = self.find_matching_rule(tache)
        if not rule:
            return 0.0, 0.0, 1.0, "no_matching_rule"
        
        # 2. Extraire le volume UI
        volume_annuel = self.get_volume_from_ui_path(rule.ui_path, volumes_ui)
        
        # 🆕 FALLBACK GLOBAL: Si volume spécifique est 0, essayer le volume GLOBAL du même flux
        if volume_annuel <= 0 and ".part" in rule.ui_path.lower() or ".pro" in rule.ui_path.lower() or ".dist" in rule.ui_path.lower() or ".axes" in rule.ui_path.lower():
            # Construire le chemin fallback (ex: flux_arrivee.amana.part -> flux_arrivee.amana.global_)
            parts = rule.ui_path.split('.')
            if len(parts) >= 2:
                # Remplacer le dernier segment par "global_"
                fallback_path = ".".join(parts[:-1]) + ".global_"
                volume_global = self.get_volume_from_ui_path(fallback_path, volumes_ui)
                
                if volume_global > 0:
                    volume_annuel = volume_global
                    # print(f"    🔸 FALLBACK: Utilisation de {fallback_path} ({volume_global}) pour {rule.ui_path}")
        
        if volume_annuel <= 0:
            return 0.0, 0.0, 1.0, f"{rule.ui_path}(0)"
        
        # 3. Appliquer le facteur de conversion d'unité
        facteur_conversion = self.get_conversion_factor(tache.unite_mesure)
        
        # Override dynamique si l'unité est un Sac ou une Collecte
        unite_upper = (tache.unite_mesure or "").upper().strip()
        
        if "SAC" in unite_upper:
            # Pour les tâches avec l'unité "Sac", on doit calculer le NOMBRE DE SACS
            # au lieu d'utiliser directement le volume de courriers/colis
            
            if "AMANA" in (tache.nom_tache or "").upper() or "AMANA" in (rule.ui_path or "").upper():
                # Sacs AMANA : calculer nb_sacs = volume_colis / colis_par_sac
                colis_par_sac = volumes_ui.colis_amana_par_sac or 5.0
                # volume_annuel contient le nombre de colis, on divise par colis_par_sac
                volume_annuel = volume_annuel / colis_par_sac if colis_par_sac > 0 else 0.0
                facteur_conversion = 1.0  # Pas de conversion supplémentaire
            else:
                # Sacs COURRIER : calculer nb_sacs = volume_courriers / courriers_par_sac
                courriers_par_sac = volumes_ui.courriers_par_sac or 4500.0
                # volume_annuel contient le nombre de courriers, on divise par courriers_par_sac
                volume_annuel = volume_annuel / courriers_par_sac if courriers_par_sac > 0 else 0.0
                facteur_conversion = 1.0  # Pas de conversion supplémentaire
                
        elif "COLLECTE" in unite_upper:
            val = volumes_ui.colis_par_collecte or 1.0
            facteur_conversion = 1.0 / val if val > 0 else 0.0
            
        volume_annuel_converti = volume_annuel * facteur_conversion
        
        # 🆕 4. Appliquer ED% (En Dehors) - UNIQUEMENT POUR AMANA
        # Si ED% = 75%, alors 75% des colis AMANA sont "en dehors" (ignorés)
        # et seulement 25% passent par le centre ("en sac")
        # Cette règle s'applique à AMANA uniquement (tous segments et sens)
        if ed_percent > 0:
            # Vérifier si la tâche concerne AMANA
            flux_code = self._flux_codes.get(tache.flux_id, "").upper()
            is_amana = "AMANA" in flux_code or "AMANA" in (tache.nom_tache or "").upper() or "AMANA" in (rule.ui_path or "").upper()
            
            if is_amana:
                pourcentage_en_sac = (100.0 - ed_percent) / 100.0
                volume_annuel_converti = volume_annuel_converti * pourcentage_en_sac
                # print(f"    🔹 ED% appliqué (AMANA): {ed_percent}% → Volume réduit à {pourcentage_en_sac*100}% = {volume_annuel_converti}")
        
        # 5. Convertir en volume/jour
        nb_jours = volumes_ui.nb_jours_ouvres_an or 264
        volume_jour = volume_annuel_converti / nb_jours
        
        # print(f"    DEBUG ENGINE: path={rule.ui_path} vol_an={volume_annuel} conv={facteur_conversion} vol_j={volume_jour} (nb_j={nb_jours})")
        
        return volume_annuel, volume_jour, facteur_conversion, rule.ui_path
    
    def calculate_task_charge(
        self,
        tache: Tache,
        volume_jour: float
    ) -> float:
        """
        Calcule la charge en minutes pour une tâche.
        
        charge_minutes = moyenne_min × volume_jour
        """
        moyenne_min = float(tache.moyenne_min or 0.0)
        return moyenne_min * volume_jour
    
    def calculate_etp(
        self,
        total_heures: float,
        heures_par_jour: float,
        idle_minutes: float,
        productivite: float
    ) -> Tuple[float, int]:
        """
        Calcule l'ETP selon la formule métier.
        
        Returns:
            Tuple (fte_calcule, fte_arrondi)
        """
        # Heures nettes
        idle_heures = idle_minutes / 60.0
        heures_nettes = max(0.0, heures_par_jour - idle_heures)
        
        # ETP calculé : On ne réduit PLUS les heures_nettes par la productivité 
        # car productivité est déjà intégrée dans total_heures (Total_Charge / P)
        fte_calcule = total_heures / heures_nettes if heures_nettes > 0 else 0.0
        
        # ETP arrondi (règle métier)
        if fte_calcule <= 0.1:
            fte_arrondi = 0
        else:
            # Arrondi à l'entier le plus proche (0.5 → 1)
            fte_arrondi = int(fte_calcule + 0.5)
        
        return fte_calcule, fte_arrondi
    
    def get_reference_codes(self, tache: Tache) -> Dict[str, Optional[str]]:
        """Récupère les codes de référence pour une tâche (pour debug)."""
        return {
            "flux": self._flux_codes.get(tache.flux_id),
            "sens": self._sens_codes.get(tache.sens_id),
            "segment": self._segment_codes.get(tache.segment_id)
        }
    
    def aggregate_by_dimension(
        self,
        task_results: List[Dict[str, Any]],
        dimension: str
    ) -> Dict[Any, float]:
        """
        Agrège les résultats par dimension (centre, sens, segment, etc.).
        
        Args:
            task_results: Liste des résultats par tâche
            dimension: Nom de la dimension ("centre_id", "sens", "segment", etc.)
        
        Returns:
            Dict {dimension_value: total_heures}
        """
        aggregation = {}
        
        for result in task_results:
            key = result.get(dimension)
            if key is not None:
                aggregation[key] = aggregation.get(key, 0.0) + result.get("heures", 0.0)
        
        return aggregation


def create_data_driven_engine(db: Session) -> DataDrivenEngine:
    """Factory function pour créer un DataDrivenEngine."""
    return DataDrivenEngine(db)
