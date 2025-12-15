# Fonctions utilitaires (normalisation, arrondis, etc.)
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

def normalize_unit(unit: str) -> str:
    """Normalise l'unité de mesure pour correspondre aux clés du unit_map."""
    unit_lower = str(unit or "").lower().strip()
    mapping = {
        "sac": "sacs",
        "sacs": "sacs",
        "coli": "colis",
        "colis": "colis",
        "colis_amana": "colis",
        "colis amana": "colis",
        "courrier": "courrier",
        "courriers": "courrier",
        "courrier recommande": "courrier_recommande",
        "courrier recommandé": "courrier_recommande",
        "courrier recommandé": "courrier_recommande",  # forme avec accent composé
        "colis_courrier": "colis_courrier",
    }
    return mapping.get(unit_lower, unit_lower)

def round_half_up(value: float) -> int:
    """Arrondi mathématique (0.5 → 1)."""
    d = Decimal(str(value))
    return int(d.quantize(Decimal('1'), rounding=ROUND_HALF_UP))
