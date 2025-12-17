from typing import Optional, Dict, List, Any

JOURS_OUVRES_AN = 264

def as_snake_annual(va: Optional[Any]) -> Dict[str, float]:
    """
    Convertit un objet VolumesAnnuels (ou dict) en dictionnaire snake_case.
    """
    if not va:
        return {}
    try:
        d = va.dict()
    except Exception:
        d = dict(va) if va else {}

    found_any = False

    def g(*keys, default=0.0):
        nonlocal found_any
        for k in keys:
            if k in d and d[k] is not None:
                found_any = True
                return float(d[k] or 0)
        return float(default)

    annual = {
        "courrier_ordinaire": g("courrier_ordinaire", "courrierOrdinaire"),
        "courrier_recommande": g("courrier_recommande", "courrierRecommande"),
        "ebarkia": g("ebarkia"),
        "lrh": g("lrh"),
        "amana": g("amana"),
    }
    return annual if found_any else {}


def annual_to_daily_post(vols: Dict[str, float]) -> Dict[str, float]:
    """
    Reçoit des volumes ANNUELS (sacs/colis/scellé) et les convertit en /jour (divisé par 264).
    Applique aussi les ratios par défaut si absents.
    """
    v = {**vols}

    def div_if_present(key: str):
        val = float(v.get(key, 0) or 0)
        # La logique 'reférence' divise par 264 (considérant l'input comme annuel)
        v[key] = val / JOURS_OUVRES_AN

    div_if_present("sacs")
    div_if_present("colis")
    div_if_present("scelle")

    # Ratios par défaut (Source: api/simulation.py)
    if v.get("colis_amana_par_sac") in (None, ""):
        v["colis_amana_par_sac"] = 5.0
    else:
        v["colis_amana_par_sac"] = float(v["colis_amana_par_sac"])
        
    if v.get("courriers_par_sac") in (None, ""):
        v["courriers_par_sac"] = 4500.0
    else:
        v["courriers_par_sac"] = float(v["courriers_par_sac"])
        
    # Default colis_par_collecte ? In api/simulation.py it's handled like this:
    if v.get("colis_par_collecte") in (None, ""):
        v["colis_par_collecte"] = 1.0
    else:
        v["colis_par_collecte"] = float(v["colis_par_collecte"])

    return v


def creer_tache_regroupee(nom: str, taches_list: List[Dict], type_courrier: str) -> Optional[Dict]:
    """
    Regroupe une liste de tâches (ex: 'courrier ordinaire') en une seule tâche consolidée
    avec moyenne des temps et unité 'courriers'.
    """
    if not taches_list:
        return None

    # calcul moyenne
    total_moyenne = sum(t.get("moyenne_min", 0) for t in taches_list)
    moyenne_generique = total_moyenne / len(taches_list)
    premiere_tache = taches_list[0]

    unite_finale = "courriers"
    cp_id = premiere_tache.get("centre_poste_id")
    # check old logic 'NA_{type_courrier}' if None? kept consistent
    if cp_id is None:
        cp_id = f"NA_{type_courrier}"

    return {
        "id": f"regroupe_{type_courrier}",
        "nom_tache": nom,
        "phase": f"traitement_{type_courrier}",
        "unite_mesure": unite_finale,
        "moyenne_min": round(moyenne_generique, 4),
        "centre_poste_id": cp_id,
        "poste_id": premiere_tache.get("poste_id"),
        "type_flux": type_courrier,
        "is_regrouped": True # flag utile ?
    }


def regroup_tasks_for_scenarios(taches: List[Dict]) -> List[Dict]:
    """
    Applique la logique de regroupement des tâches courriers (Co, Cr, Eb, Lrh, Gen).
    """
    taches_courrier, taches_autres = [], []
    for tache in taches:
        unite = (tache.get("unite_mesure") or "").strip().lower()
        if unite == "courriers":
            taches_courrier.append(tache)
        else:
            taches_autres.append(tache)

    t_co, t_cr, t_eb, t_lrh, t_gen = [], [], [], [], []
    for tache in taches_courrier:
        nom_tache = (tache.get("nom_tache") or "").lower()
        if any(mot in nom_tache for mot in ["ordinaire", "ordinaires"]):
            t_co.append(tache)
        elif any(mot in nom_tache for mot in ["recommandé", "recommandes", "recommandée", "recommand"]):
            t_cr.append(tache)
        elif any(mot in nom_tache for mot in ["ebarkia", "e-barkia", "barkia"]):
            t_eb.append(tache)
        elif "lrh" in nom_tache:
            t_lrh.append(tache)
        else:
            t_gen.append(tache)

    taches_finales = taches_autres.copy()

    # Ordre spécifique
    for nom, data, flux in [
        ("TRAITEMENT COURRIER ORDINAIRE CONSOLIDÉ", t_co, "ordinaire"),
        ("TRAITEMENT COURRIER RECOMMANDÉ CONSOLIDÉ", t_cr, "recommande"),
        ("TRAITEMENT E-BARKIA CONSOLIDÉ", t_eb, "ebarkia"),
        ("TRAITEMENT LRH CONSOLIDÉ", t_lrh, "lrh"),
    ]:
        tr = creer_tache_regroupee(nom, data, flux)
        if tr:
            taches_finales.append(tr)

    if t_gen:
        tg = creer_tache_regroupee("TRAITEMENT TOUS COURRIERS CONSOLIDÉ", t_gen, "tous")
        if tg:
            taches_finales.append(tg)

    return taches_finales
