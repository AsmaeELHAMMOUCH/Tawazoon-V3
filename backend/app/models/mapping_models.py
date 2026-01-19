"""
Modèles de données pour le mapping data-driven des volumes UI vers les tâches.
Architecture 100% pilotée par les données, sans logique conditionnelle.
"""
from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from app.core.db import Base


class VolumeMappingRule(Base):
    """
    Table de mapping UI ↔ DB pour résoudre automatiquement les volumes.
    
    Exemple de règles :
    - flux_id=1, sens_id=1, segment_id=1 → ui_path="flux_arrivee.amana.global_"
    - flux_id=NULL, sens_id=3, segment_id=NULL, keyword="dépôt" → ui_path="guichet.depot"
    """
    __tablename__ = "volume_mapping_rules"
    __table_args__ = {"schema": "dbo"}
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Critères de matching (NULL = wildcard)
    flux_id = Column(Integer, ForeignKey("dbo.flux.id"), nullable=True)
    sens_id = Column(Integer, ForeignKey("dbo.volume_sens.id"), nullable=True)
    segment_id = Column(Integer, ForeignKey("dbo.volume_segments.id"), nullable=True)
    
    # Critère optionnel : mot-clé dans nom_tache (pour guichet)
    nom_tache_keyword = Column(String(100), nullable=True)
    
    # Chemin dans la structure UI (ex: "flux_arrivee.amana.global_")
    ui_path = Column(String(200), nullable=False)
    
    # Priorité (pour gérer les conflits, plus élevé = prioritaire)
    priority = Column(Integer, default=0)
    
    # Description pour la documentation
    description = Column(String(500), nullable=True)


class UniteConversionRule(Base):
    """
    Table de règles de conversion d'unités.
    
    Exemple :
    - unite_mesure="Sac", facteur_conversion=0.2 (1 sac = 5 colis → volume/5)
    - unite_mesure="Colis", facteur_conversion=1.0 (pas de conversion)
    """
    __tablename__ = "unite_conversion_rules"
    __table_args__ = (
        UniqueConstraint("unite_mesure", name="uq_unite_mesure"),
        {"schema": "dbo"}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Unité de mesure (doit correspondre à Tache.unite_mesure)
    unite_mesure = Column(String(50), nullable=False, unique=True)
    
    # Facteur de conversion à appliquer au volume
    # volume_applicable = volume_ui * facteur_conversion
    # Ex: Sac → 0.2 (car 1 sac = 5 colis)
    facteur_conversion = Column(Float, nullable=False, default=1.0)
    
    # Description
    description = Column(String(500), nullable=True)


class VolumeNormalization(Base):
    """
    Table de normalisation des volumes UI.
    Permet de transformer les volumes saisis en structure normalisée.
    
    Cette table stocke les volumes normalisés pour une simulation donnée.
    """
    __tablename__ = "volume_normalization"
    __table_args__ = (
        UniqueConstraint(
            "simulation_id", "centre_poste_id", "flux_id", "sens_id", "segment_id",
            name="uq_volume_norm"
        ),
        {"schema": "dbo"}
    )
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Référence à la simulation (optionnel, peut être NULL pour simulation directe)
    simulation_id = Column(Integer, nullable=True, index=True)
    
    # Dimensions du volume
    centre_poste_id = Column(Integer, ForeignKey("dbo.centre_postes.id"), nullable=False)
    flux_id = Column(Integer, ForeignKey("dbo.flux.id"), nullable=True)
    sens_id = Column(Integer, ForeignKey("dbo.volume_sens.id"), nullable=False)
    segment_id = Column(Integer, ForeignKey("dbo.volume_segments.id"), nullable=True)
    
    # Produit (optionnel, pour traçabilité)
    produit = Column(String(50), nullable=True)
    
    # Volume annuel
    volume_annuel = Column(Float, nullable=False, default=0.0)
    
    # Volume journalier (calculé automatiquement)
    volume_jour = Column(Float, nullable=False, default=0.0)
    
    # Source UI (pour debug)
    source_ui_path = Column(String(200), nullable=True)
