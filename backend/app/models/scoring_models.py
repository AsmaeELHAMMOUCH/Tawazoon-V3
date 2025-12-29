from sqlalchemy import Column, Integer, Float, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.db import Base

class ScoringCampaign(Base):
    __tablename__ = "scoring_campaigns"
    __table_args__ = {"schema": "dbo"}

    id = Column(String(50), primary_key=True) # e.g., "SCORING-20251225-1030"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Traçabilité utilisateur
    launched_by_user_id = Column(Integer, nullable=True) # ID de l'utilisateur
    launched_by_username = Column(String(100), nullable=True) # Nom de l'utilisateur pour affichage
    
    # Périmètre de simulation
    scope_type = Column(String(50), nullable=True) # "all", "region", "direction", "centre"
    scope_value = Column(String(50), nullable=True) # ID du périmètre
    scope_label = Column(String(200), nullable=True) # Label lisible du périmètre (ex: "Région Casablanca")
    
    # Description optionnelle
    description = Column(String(500), nullable=True)
    
    results = relationship("ScoringResult", back_populates="campaign", cascade="all, delete-orphan")

class ScoringResult(Base):
    __tablename__ = "scoring_results"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(String(50), ForeignKey("dbo.scoring_campaigns.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False)
    
    global_score = Column(Float, nullable=False)
    simulated_class = Column(String(20), nullable=False) # "Classe A", "Classe B"...
    impact = Column(String(20), nullable=True) # "Promotion", "Reclassement", "Stable"
    
    # Store snapshot of indicators used for record keeping
    effectif_input = Column(Float, nullable=True) # The ETP used
    
    campaign = relationship("ScoringCampaign", back_populates="results")
    centre = relationship("Centre")
    details = relationship("ScoringDetail", back_populates="result", cascade="all, delete-orphan")

class ScoringDetail(Base):
    __tablename__ = "scoring_details"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    result_id = Column(Integer, ForeignKey("dbo.scoring_results.id"), nullable=False)
    
    indicator_key = Column(String(50), nullable=False)
    label = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=True)
    
    tier_range = Column(String(50), nullable=True) # "[0 - 1000]"
    points = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)
    score = Column(Float, nullable=False)
    
    result = relationship("ScoringResult", back_populates="details")
