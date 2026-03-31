from sqlalchemy import Column, Float, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.db import Base

from sqlalchemy.orm import relationship
from app.core.db import Base


class Activite(Base):
    __tablename__ = "ActiviteListe"
    __table_args__ = {"schema": "dbo"}

    id_activite = Column(Integer, primary_key=True, index=True)
    nom_activite = Column(String(50), nullable=False)
    description = Column(String(255))
    code_activite = Column(String(10), nullable=False)


def normalize_ws(s: str) -> str:
    if not s: return ""
    return "".join(str(s).split()).lower()

def sql_normalize_ws(col):
    from sqlalchemy import func
    return func.replace(func.lower(col), ' ', '')


class Region(Base):
    __tablename__ = "regions"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)

    centres = relationship("Centre", back_populates="region")


class Categorie(Base):
    __tablename__ = "categories"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)

    centres = relationship("Centre", back_populates="categorie")


class Categorisation(Base):
    __tablename__ = "Categorisation"
    __table_args__ = {"schema": "dbo"}

    id_categorisation = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)

    centres = relationship("Centre", back_populates="categorisation")


class Centre(Base):
    __tablename__ = "centres"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)

    region_id = Column(Integer, ForeignKey("dbo.regions.id"), nullable=False)
    direction_id = Column(Integer, nullable=True) # Added missing column
    categorie_id = Column(Integer, ForeignKey("dbo.categories.id"), nullable=True)
    id_categorisation = Column(Integer, ForeignKey("dbo.Categorisation.id_categorisation"), nullable=True) # Pour la catégorisation (Classe A, B, C...)
    aps = Column(Float, name="APS", nullable=True, default=0.0)
    code_ville = Column(String, nullable=True) # Colonne de liaison avec la table Ville

    region = relationship("Region", back_populates="centres")
    categorie = relationship("Categorie", back_populates="centres")
    categorisation = relationship("Categorisation", back_populates="centres")

    attached_sites = relationship("AttachedSite", back_populates="centre", cascade="all, delete-orphan")
    centre_postes = relationship("CentrePoste", back_populates="centre")


class Poste(Base):
    __tablename__ = "postes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    type_poste = Column("type_poste", String(50))
    Code = Column(String(50), nullable=True, unique=True)
    hie_poste = Column(String(50), nullable=True)  # ✅ AJOUT: Code hiérarchie pour l'organigramme
    charge_salaire = Column(Float, nullable=True)

    centre_postes = relationship("CentrePoste", back_populates="poste")

class HierarchiePostes(Base):
    __tablename__ = "Hierarchie_postes"
    __table_args__ = {"schema": "dbo"}

    id = Column("ID", Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    code = Column("Code", String(50), nullable=False)  # Clé de jointure avec Poste.hie_poste


class CentrePoste(Base):
    __tablename__ = "centre_postes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False)
    poste_id = Column(Integer, ForeignKey("dbo.postes.id"), nullable=False)
    effectif_actuel = Column(Integer, nullable=True, default=0)
    aps = Column(Float, nullable=True, default=0.0)
    code_resp = Column(String(50), nullable=True)

    centre = relationship("Centre", back_populates="centre_postes")
    poste = relationship("Poste", back_populates="centre_postes")
    taches = relationship("Tache", back_populates="centre_poste", cascade="all, delete-orphan")


class Tache(Base):
    __tablename__ = "taches"
    __table_args__ = (
        Index("idx_taches_match", "centre_poste_id", "flux_id", "sens_id", "segment_id"),
        {"schema": "dbo"}
    )

    id = Column(Integer, primary_key=True, index=True)
    centre_poste_id = Column(
        Integer, ForeignKey("dbo.centre_postes.id"), nullable=False
    )

    nom_tache = Column(String, nullable=False)
    famille_uo = Column(String, nullable=True)  # ✅ AJOUT: Nécessaire pour le mapping par famille
    phase = Column(String, nullable=True)
    unite_mesure = Column(String, nullable=False)
    etat = Column(String, nullable=True)  # 🆕 AJOUT: État de la tâche (ex: 'NA' pour non active)
    ordre = Column(Integer, nullable=True) # 🆕 AJOUT: Ordre d'affichage
    
    min_min = Column(String, nullable=True)
    moy_sec = Column(String, nullable=True) 
    max_min = Column(String, nullable=True)
    max_sec = Column(String, nullable=True)
    
    # 🆕 Nouveau champ pour la logique ED / Sac
    base_calcul = Column(String, nullable=True)
    
    # 🆕 Champ produit pour la règle 2064
    produit = Column(String, nullable=True)

    moyenne_min = Column(String, nullable=True, default="0.0")

    # New Foreign Keys
    flux_id = Column(Integer, ForeignKey("dbo.flux.id"), nullable=True)
    sens_id = Column(Integer, ForeignKey("dbo.volume_sens.id"), nullable=True)
    segment_id = Column(Integer, ForeignKey("dbo.volume_segments.id"), nullable=True)

    centre_poste = relationship("CentrePoste", back_populates="taches")
    flux = relationship("Flux")
    sens = relationship("VolumeSens")
    segment = relationship("VolumeSegment")


class CentreVolumeRef(Base):
    __tablename__ = "centre_volumes_ref"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False, unique=True)
    
    # Volumes annuels de référence
    sacs = Column(Float, default=0)
    colis = Column(Float, default=0)
    courrier_ordinaire = Column(Float, default=0)
    courrier_recommande = Column(Float, default=0)
    ebarkia = Column(Float, default=0)
    lrh = Column(Float, default=0)
    amana = Column(Float, default=0)

    # Ratios
    colis_amana_par_sac = Column(Float, nullable=True)
    courriers_par_sac = Column(Float, nullable=True)

    centre = relationship("Centre", back_populates="volume_ref")


class Flux(Base):
    __tablename__ = "flux"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False)
    libelle = Column(String(100), nullable=True)


class VolumeSens(Base):
    __tablename__ = "volume_sens"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False)
    libelle = Column(String(100), nullable=True)


class VolumeSegment(Base):
    __tablename__ = "volume_segments"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), nullable=False)
    libelle = Column(String(100), nullable=True)


class Ville(Base):
    __tablename__ = "Ville"
    __table_args__ = {"schema": "dbo"}

    id = Column("ID", Integer, primary_key=True, index=True)
    code = Column("Code", String(50), nullable=False, unique=True)
    label = Column(String, nullable=False)
    geographie = Column(Float, default=0.0)
    circulation = Column(Float, default=0.0)
    trajet = Column(Float, default=0.0)


class VolumeSimulation(Base):
    __tablename__ = "volume_simulation"
    __table_args__ = (
        Index("idx_vol_sim_match", "simulation_id", "centre_poste_id", "flux_id", "sens_id", "segment_id"),
        {"schema": "dbo"}
    )

    # Composite PK likely needed or just an ID. 
    # Prompt says key: simulation_id + centre_poste_id + flux_id + sens_id + segment_id + volume
    # We will use an auto-increment ID for simplicity in ORM unless strictly constrained.
    id = Column(Integer, primary_key=True, index=True)
    
    simulation_id = Column(Integer, nullable=False, index=True)
    centre_poste_id = Column(Integer, nullable=False)
    flux_id = Column(Integer, nullable=False)
    sens_id = Column(Integer, nullable=False)
    segment_id = Column(Integer, nullable=False)
    
    volume = Column(Float, default=0.0)


# Update Centre to include persistence relationship
Centre.volume_ref = relationship("CentreVolumeRef", uselist=False, back_populates="centre")


class MappingPosteRecommande(Base):
    __tablename__ = "mapping_postes_recommandes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    poste_source_id = Column(Integer, ForeignKey("dbo.postes.id"), nullable=False)
    poste_cible_id = Column(Integer, ForeignKey("dbo.postes.id"), nullable=False)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=True)

    poste_source = relationship("Poste", foreign_keys=[poste_source_id])
    poste_cible = relationship("Poste", foreign_keys=[poste_cible_id])
    centre = relationship("Centre")


class TacheExclueOptimisee(Base):
    __tablename__ = "taches_exclues_optimisees"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Pour l'exclusion par ID (Centre spécifique) ---
    tache_id = Column(Integer, ForeignKey("dbo.taches.id"), nullable=True) # Devient optionnel
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=True) # Optionnel
    
    # --- Pour l'exclusion par Typologie (Global à la catégorie) ---
    categorie_id = Column(Integer, ForeignKey("dbo.categories.id"), nullable=True)
    nom_tache = Column(String, nullable=True)
    famille_uo = Column(String, nullable=True)
    produit = Column(String, nullable=True)
    unite_mesure = Column(String, nullable=True)

    tache = relationship("Tache")
    centre = relationship("Centre")
    categorie = relationship("Categorie")

class AttachedSite(Base):
    __tablename__ = "attached_sites"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    code = Column(String(50), nullable=False, unique=True)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False)

    centre = relationship("Centre", back_populates="attached_sites")