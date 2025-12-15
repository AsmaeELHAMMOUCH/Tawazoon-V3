from pydantic import BaseModel

class GlobalParamsIn(BaseModel):
    productivite: float = 100.0
    temps_mort_min: float = 0.0

class GlobalParamsOut(BaseModel):
    productivite: float
    heures_jour: float
    temps_mort_min: float
    heures_nettes_jour: float

def compute_global_params(p: GlobalParamsIn) -> GlobalParamsOut:
    # Formula:
    # Heures / Jour = (Productivité / 100) * 8.0  (assuming 8h base)
    # Heures Nettes / Jour = Heures / Jour - (Temps Mort / 60)
    
    # Base constant
    BASE_HOURS_PER_DAY = 7.5 # Adjusted to standard 7h30 often used, or 8.0? 
    # Previous code had "8" in context. Let's use 8.0 as base reference, 
    # but typically work day is 7h, 7h30 or 8h. 
    # Frontend Context used "const [heuresParJour, setHeuresParJour] = useState(8);"
    # So we stick to 8.0.
    
    h_jour = (p.productivite / 100.0) * 8.0
    
    # Subtract temps mort (min -> hour)
    t_mort_h = p.temps_mort_min / 60.0
    h_nettes = max(0.0, h_jour - t_mort_h)
    
    return GlobalParamsOut(
        productivite=round(p.productivite, 2),
        heures_jour=round(h_jour, 2),
        temps_mort_min=round(p.temps_mort_min, 2),
        heures_nettes_jour=round(h_nettes, 2)
    )
