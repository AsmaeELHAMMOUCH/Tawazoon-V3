"""
Centralize model exports to avoid duplicate table declarations.

This module must NOT redefine models; it should only re-export
the canonical SQLAlchemy models.
"""

from app.models.db_models import (
    Region,
    Centre,
    Poste,
    CentrePoste,
    Tache,
    Activite,
)

__all__ = ["Region", "Centre", "Poste", "CentrePoste", "Tache", "Activite"]
