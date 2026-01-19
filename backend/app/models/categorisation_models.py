# app/models/categorisation_models.py
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.db import Base

class CategorisationSimulation(Base):
    """
    Table pour stocker les résultats de simulation destinés à la catégorisation.
    Chaque fois qu'une simulation est lancée dans Vue Centre, les effectifs calculés
    sont sauvegardés ici pour être utilisés dans la page Catégorisation.
    """
    __tablename__ = "categorisation_simulations"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False, index=True)
    simulation_id = Column(Integer, nullable=True)  # Référence optionnelle à la simulation source
    
    # Métadonnées
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    commentaire = Column(String, nullable=True)
    
    # Totaux globaux
    total_etp_calcule = Column(Float, nullable=True)
    total_etp_arrondi = Column(Integer, nullable=True)
    total_heures = Column(Float, nullable=True)


class CategorisationPoste(Base):
    """
    Détail des effectifs par poste pour une simulation de catégorisation.
    """
    __tablename__ = "categorisation_postes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    categorisation_simulation_id = Column(Integer, ForeignKey("dbo.categorisation_simulations.id"), nullable=False, index=True)
    
    centre_poste_id = Column(Integer, nullable=False)
    poste_id = Column(Integer, nullable=False)
    poste_label = Column(String, nullable=True)
    type_poste = Column(String, nullable=True)  # MOD/MOI
    
    # Effectifs
    effectif_actuel = Column(Integer, nullable=True)
    etp_calcule = Column(Float, nullable=True)
    etp_arrondi = Column(Integer, nullable=True)
    total_heures = Column(Float, nullable=True)
    ecart = Column(Integer, nullable=True)  # etp_arrondi - effectif_actuel
