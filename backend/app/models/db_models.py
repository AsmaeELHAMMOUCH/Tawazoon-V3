from sqlalchemy import Column, Float, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base


class Activite(Base):
    __tablename__ = "ActiviteListe"
    __table_args__ = {"schema": "dbo"}

    id_activite = Column(Integer, primary_key=True, index=True)
    nom_activite = Column(String(50), nullable=False)
    description = Column(String(255))
    code_activite = Column(String(10), nullable=False)


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


class Centre(Base):
    __tablename__ = "centres"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)

    region_id = Column(Integer, ForeignKey("dbo.regions.id"), nullable=False)
    categorie_id = Column(Integer, ForeignKey("dbo.categories.id"), nullable=True)

    region = relationship("Region", back_populates="centres")
    categorie = relationship("Categorie", back_populates="centres")

    centre_postes = relationship("CentrePoste", back_populates="centre")


class Poste(Base):
    __tablename__ = "postes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    label = Column(String, nullable=False)
    type_poste = Column(String(10), nullable=True, index=True)  # 'MOD' | 'MOI'

    centre_postes = relationship("CentrePoste", back_populates="poste")


class CentrePoste(Base):
    __tablename__ = "centre_postes"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    centre_id = Column(Integer, ForeignKey("dbo.centres.id"), nullable=False)
    poste_id = Column(Integer, ForeignKey("dbo.postes.id"), nullable=False)
    effectif_actuel = Column(Integer, nullable=True, default=0)

    centre = relationship("Centre", back_populates="centre_postes")
    poste = relationship("Poste", back_populates="centre_postes")
    taches = relationship("Tache", back_populates="centre_poste")


class Tache(Base):
    __tablename__ = "taches"
    __table_args__ = {"schema": "dbo"}

    id = Column(Integer, primary_key=True, index=True)
    centre_poste_id = Column(
        Integer, ForeignKey("dbo.centre_postes.id"), nullable=False
    )

    nom_tache = Column(String, nullable=False)
    phase = Column(String, nullable=True)
    unite_mesure = Column(String, nullable=False)

    min_min = Column(Integer, nullable=True)
    min_sec = Column(Integer, nullable=True)
    max_min = Column(Integer, nullable=True)
    max_sec = Column(Integer, nullable=True)

    moyenne_min = Column(Float, nullable=True, default=0.0)

    centre_poste = relationship("CentrePoste", back_populates="taches")
