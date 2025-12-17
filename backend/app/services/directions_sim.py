#services/directions_sim.py
from math import ceil
from typing import Dict

MIN_BY_UNIT = {"sacs": 2.0, "colis": 1.2, "courrier": 0.08}

def hours_from_volumes(v: Dict) -> float:
    mins = (
        float(v.get("sacs", 0))     * MIN_BY_UNIT["sacs"] +
        float(v.get("colis", 0))    * MIN_BY_UNIT["colis"] +
        float(v.get("courrier", 0)) * MIN_BY_UNIT["courrier"] 

    )
    return mins / 60.0

def ceil_int(x: float) -> int:
    return int(ceil(x))
