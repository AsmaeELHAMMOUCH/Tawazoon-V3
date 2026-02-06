from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.schemas.volumes_ui import VolumesUIInput
from app.schemas.models import SimulationResponse, TacheDetail, PosteResultat
from app.models.db_models import Tache, CentrePoste, Centre

# --- CONTEXTE DE VOLUME ---
class VolumeContext:
    def __init__(self, volumes_ui: VolumesUIInput, centre_id: int = None, db: Session = None):
        self.raw_volumes = volumes_ui
        self.centre_id = centre_id
        self.db = db
        # Ajouter ici les propriétés calculées (ex: totaux annuels)
        self.nb_jours_ouvres_an = volumes_ui.nb_jours_ouvres_an or 264

    def get_volume(self, flux: str, sens: str, segment: str = "GLOBAL") -> float:
        """
        Récupère un volume par son code flux/sens/segment depuis la liste plate volumes_flux.
        """
        if not self.raw_volumes.volumes_flux:
            return 0.0
        
        flux = flux.upper()
        sens = sens.upper()
        segment = segment.upper()
        
        for item in self.raw_volumes.volumes_flux:
            if (item.flux.upper() == flux and 
                item.sens.upper() == sens and 
                item.segment.upper() == segment):
                return float(item.volume)
        return 0.0

    def get_aggregated_volume(self, flux: str, sens: str) -> float:
        """
        Calcule la somme de tous les volumes (segments) pour un flux/sens donné.
        Exclut explicitement le segment 'GLOBAL' pour éviter les doublons si on veut recalculer le total.
        """
        if not self.raw_volumes.volumes_flux:
            return 0.0
            
        flux = flux.upper()
        sens = sens.upper()
        total = 0.0
        
        for item in self.raw_volumes.volumes_flux:
            if item.flux.upper() == flux and item.sens.upper() == sens:
                if item.segment.upper() != "GLOBAL":
                    total += float(item.volume)
        
        # Fallback: Si total est 0, on regarde s'il y a un GLOBAL
        if total == 0.0:
            for item in self.raw_volumes.volumes_flux:
                if (item.flux.upper() == flux and 
                    item.sens.upper() == sens and 
                    item.segment.upper() == "GLOBAL"):
                    return float(item.volume)
                    
        return total

    def get_effectif_facteur_distributeur(self) -> float:
        """
        Récupère l'effectif actuel du poste 'Facteur Distributeur' pour le même centre.
        """
        if not self.db or not self.centre_id:
            return 0.0
        
        # Chercher le poste 'Facteur Distributeur' dans ce centre
        from app.models.db_models import CentrePoste, Poste 
        from sqlalchemy import func
        
        effectif = self.db.query(func.sum(CentrePoste.effectif_actuel))\
            .join(Poste, CentrePoste.poste_id == Poste.id)\
            .filter(
                CentrePoste.centre_id == self.centre_id,
                Poste.label.ilike("%FACTEUR DISTRIBUTEUR%")
            ).scalar()
        
        return float(effectif or 0.0)

# --- FONCTION DE CALCUL UNITAIRE ---
def calculer_volume_applique(tache: Any, context: VolumeContext) -> tuple:
    """
    Calcule le volume à appliquer pour une tâche donnée.
    Returns:
        (volume_annuel, volume_journalier, facteur_conversion, ui_path)
    """
    produit = str(getattr(tache, 'produit', '') or '').strip().upper()
    unite = str(getattr(tache, 'unite_mesure', '') or '').strip().upper()
    
    # Log de traçage pour debug
    def log_trace(message):
        with open("trace_calcul.log", "a", encoding="utf-8") as f:
            f.write(f"{message}\n")
        print(message)  # Aussi dans stdout
    
    volume_annuel = 0.0
    volume_jour = 0.0
    facteur_conversion = 1.0
    ui_path = "N/A"
    
    # DEBUG TRACE
    if "Rapprochement" in tache.nom_tache:
        print(f"DEBUG_TASK: ID={getattr(tache, 'id_tache', '?')} NOM={tache.nom_tache} PROD_RAW='{getattr(tache, 'produit', '')}' PROD_NORM='{produit}' FAMILLE='{getattr(tache, 'famille_uo', '')}'")

    nb_jours = context.nb_jours_ouvres_an
    
    # ---------------------------------------------------------
    # 1. PRODUIT: AMANA REÇU (ou AMANA ARRIVÉ)
    # ---------------------------------------------------------
    # ---------------------------------------------------------
    if produit in ["AMANA RECU", "AMANA REÇU", "AMANA ARRIVÉ", "AMANA ARRIVE"]:
        log_trace(f"📦 BLOC AMANA RECU: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        if base_val != 100 and base_val != 60 and base_val != 40:
             return 0.0, 0.0, 1.0, f"N/A (Base={base_val})"
        
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()

        if "Comptage Colis" in tache.nom_tache:
             print(f"DEBUG_IN_AMANA_RECU: {tache.nom_tache} PROD={produit} BASE={base_val} UNIT={unite}")

        # --- BRANCHE 0 (PRIORITAIRE) : Comptage / Rapprochement ---
        if ("COMPTAGE" in tache.nom_tache.upper() and "COLIS" in tache.nom_tache.upper()) or "RAPPROCHEMENT" in tache.nom_tache.upper():
             # Hypothèse : S'applique sur tout le flux Arrivée (Agregat)
             vol_source = context.get_aggregated_volume("AMANA", "ARRIVEE")
             ui_path = "AMANA.ARRIVEE.AGREGAT (Spec: Cpt/Rapp)"
             
             # Logique permissivie pour Base 60/100
             if base_val == 60:
                 if unite in ["SAC", "SACS"]:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 elif unite in ["CAISSON", "CAISSONS"]:
                     # Utilisation ratio CR par défaut ou 500
                     ratio_defaut = 500.0
                     volume_annuel = vol_source / ratio_defaut
                     facteur_conversion = 1.0 / ratio_defaut
                     ui_path += f" [Base 60% / Caisson (Ratio={ratio_defaut})]"
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
             
             # Base 100, Base 40, ou autre
             else:
                 volume_annuel = vol_source
                 ui_path += f" [Base {base_val}%]"

        # --- BRANCHE 1 : Arrivée Camion Principal ---
        elif "ARRIVÉE CAMION PRINCIPAL" in famille or "ARRIVEE CAMION PRINCIPAL" in famille:
            # Source : AGREGAT ARRIVEE (PART + PRO)
            vol_source = context.get_aggregated_volume("AMANA", "ARRIVEE")
            ui_path = "AMANA.ARRIVEE.AGREGAT"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 + UNITÉ SAC ---
            elif base_val == 60 and unite in ["SAC", "SACS"]:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
            
            else:
                return 0.0, 0.0, 1.0, f"N/A (ACP-Base={base_val}/Unit={unite})"

        # --- BRANCHE 2 : Départ Axes ---
        elif "DÉPART AXES" in famille or "DEPART AXES" in famille:
            # Source : AGREGAT ARRIVEE (PART + PRO) 
            vol_aggregat = context.get_aggregated_volume("AMANA", "ARRIVEE")
            
            # Correction: Départ Axes prend la PARTIE AXES
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            # Volume = Volume Total * %Axes
            vol_source = vol_aggregat * pct_axes
            
            ui_path = f"AMANA.ARRIVEE.AGREGAT x {pct_axes:.2%}(Axes)"
            
             # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 + UNITÉ SAC ---
            elif base_val == 60 and unite in ["SAC", "SACS"]:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (DA-Base={base_val}/Unit={unite})"
                 
        # --- BRANCHE 3 : Distribution Locale ---
        elif "DISTRIBUTION LOCALE" in famille:
            # Source : AGREGAT ARRIVEE (PART + PRO)
            vol_aggregat = context.get_aggregated_volume("AMANA", "ARRIVEE")
            
            # Distribution Locale prend la PARTIE RESTANTE (1 - %Axes)
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            
            facteur_local = 1.0 - pct_axes
            vol_source = vol_aggregat * facteur_local
            
            ui_path = f"AMANA.ARRIVEE.AGREGAT x {facteur_local:.2%}(Local)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 + UNITÉ SAC ---
            elif base_val == 60 and unite in ["SAC", "SACS"]:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (DL-Base={base_val}/Unit={unite})"


        # --- BRANCHE 5 : Guichet ---
        elif "GUICHET" in famille:
            # Priorité: Volume 'AMANA' / 'GUICHET' / 'RECU'
            vol_guichet_recu = context.get_volume("AMANA", "GUICHET", "RECU")
            
            if vol_guichet_recu > 0:
                vol_source = vol_guichet_recu
                ui_path = f"AMANA.GUICHET.RECU ({vol_guichet_recu:.0f})"
            else:
                # Fallback: Arrivée Local comme Distribution Locale
                vol_aggregat = context.get_aggregated_volume("AMANA", "ARRIVEE")
                pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
                if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                facteur_local = 1.0 - pct_axes
                
                vol_source = vol_aggregat * facteur_local
                ui_path = f"AMANA.ARRIVEE.AGREGAT(Fallback) x {facteur_local:.2%}(Local)"
            
            # Application des règles Base sur le volume sélectionné
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 + UNITÉ SAC ---
            elif base_val == 60 and unite in ["SAC", "SACS"]:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (GUI-Base={base_val}/Unit={unite})"




        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"

        # Calcul journalier commun
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        # Application du facteur base_calcul (100% ou 60%)
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
        
    # ---------------------------------------------------------
    # 2. PRODUIT: AMANA DEPOT (ou DÉPÔT)
    # ---------------------------------------------------------
    elif produit in ["AMANA DEPOT", "AMANA DÉPÔT", "AMANA DEPÔT", "AMANA DÉPOT"]:
        
        # Récupération de la base de calcul (commune)
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Arrivée Camions Axes ---
        if "ARRIVÉE CAMIONS AXES" in famille or "ARRIVEE CAMIONS AXES" in famille:
            # Source : AGREGAT DEPART (PART + PRO)
            vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
            
            pct_axes = context.raw_volumes.pct_axes_depart or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            vol_source = vol_aggregat * pct_axes
            ui_path = f"AMANA.DEPART.AGREGAT x {pct_axes:.2%}(AxesD)" 
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 + UNITÉ SAC ---
            elif base_val == 60 and unite in ["SAC", "SACS"]:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (ACA-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 2 : Départ Camion Principal ---
        elif "DÉPART CAMION PRINCIPAL" in famille or "DEPART CAMION PRINCIPAL" in famille:
            # Source : AGREGAT DEPART (PART + PRO)
            vol_source = context.get_aggregated_volume("AMANA", "DEPART")
            ui_path = "AMANA.DEPART.AGREGAT"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
                
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60:
                 if unite in ["SAC", "SACS"]:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     # Cas COLIS ou defaut pour Base 60
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (DCP-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 3 : Collecte Colis ---
        elif "COLLECTE COLIS" in tache.nom_tache.upper():
             # Spécifiquement pour la tâche 'collecte colis'
             # Formule Complète: (1-Axes) * %Coll * Cplx
             
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes = pct_axes / 100.0
             facteur_hors_axes = 1.0 - pct_axes
             
             pct_collecte = context.raw_volumes.pct_collecte or 0.0
             if pct_collecte > 1.0: pct_collecte = pct_collecte / 100.0
             
             taux_complexite = context.raw_volumes.taux_complexite or 1.0
             
             vol_source = vol_aggregat * facteur_hors_axes * pct_collecte * taux_complexite
             ui_path = f"AMANA.DEPART.AGREGAT x {facteur_hors_axes:.2%}(1-Axes) x {pct_collecte:.2%}(Coll) x {taux_complexite}(Cplx)"
             
             # --- CAS 1 : BASE 100 ---
             if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
             
             # --- CAS 2, 3 ... ---
             elif base_val == 60:
                 if unite in ["SAC", "SACS"]:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
            
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

             else:
                 return 0.0, 0.0, 1.0, f"N/A (CollColis-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 4 : Autres tâches Famille COLLECTE ---
        elif "COLLECTE" in famille:
             # Pour le reste de la famille Collecte
             # Formule Simplifiée: Vol(Depart) * (1 - %Axes)
             
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes = pct_axes / 100.0
             facteur_hors_axes = 1.0 - pct_axes
             
             vol_source = vol_aggregat * facteur_hors_axes
             ui_path = f"AMANA.DEPART.AGREGAT x {facteur_hors_axes:.2%}(1-Axes)"
             
             # --- CAS 1 : BASE 100 ---
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             
             # --- AUTRES CAS (Logique par défaut identique) ---
             elif base_val == 60:
                 if unite in ["SAC", "SACS"]:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
            
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

             else:
                 return 0.0, 0.0, 1.0, f"N/A (CollFam-Base={base_val}/Unit={unite})"

        # --- BRANCHE 5 : Guichet ---
        elif "GUICHET" in famille:
             # Priorité: Volume 'AMANA' / 'GUICHET' / 'DEPOT'
             vol_guichet_depot = context.get_volume("AMANA", "GUICHET", "DEPOT")
             
             if vol_guichet_depot > 0:
                 vol_source = vol_guichet_depot
                 ui_path = f"AMANA.GUICHET.DEPOT ({vol_guichet_depot:.0f})"
             else:
                 # Fallback: AMANA DÉPART (Part+Pro) * (1 - %Axes)
                 vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
                 
                 pct_axes = context.raw_volumes.pct_axes_depart or 0.0
                 if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                 facteur_hors_axes = 1.0 - pct_axes
                 
                 vol_source = vol_aggregat * facteur_hors_axes
                 ui_path = f"AMANA.DEPART.AGREGAT(Fallback) x {facteur_hors_axes:.2%}(1-AxesD)"
             
             # --- CAS 1 : BASE 100 ---
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             
             # --- CAS 2 : BASE 60 ---
             elif base_val == 60:
                 if unite in ["SAC", "SACS"]:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
            
             # --- CAS 3 : BASE 40 ---
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

             else:
                 return 0.0, 0.0, 1.0, f"N/A (GuiDep-Base={base_val}/Unit={unite})"

        else:
            return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
            
    # --- FIN BLOC AMANA DEPOT (VERROUILLE) ---

    # ---------------------------------------------------------
    # 3. PRODUIT: CO ARRIVE (Courrier Ordinaire Arrivée)
    # ---------------------------------------------------------
    elif produit in ["CO ARRIVE", "CO ARRIVÉ", "COURRIER ORDINAIRE ARRIVE", "COURRIER ORDINAIRE ARRIVÉ"]:
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # DEBUG: Log famille for CO ARRIVE
        print(f"🔍 CO ARRIVE: ID={tache.id} '{tache.nom_tache}' FAMILLE='{famille}' UNIT='{unite}' BASE={base_val}")
        
        
        # --- BRANCHE 1 : Arrivée Camion Principal ---
        if "ARRIVÉE CAMION PRINCIPAL" in famille or "ARRIVEE CAMION PRINCIPAL" in famille:
            # Source : AGREGAT CO ARRIVEE (PART + PRO)
            # Hypothèse: 100% du volume arrivée (pas de filtre axes mentionné pour l'instant pour ACP)
            vol_source = context.get_aggregated_volume("CO", "ARRIVEE")
            ui_path = "CO.ARRIVEE.AGREGAT"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                if unite in ["SAC", "SACS"]:
                     # Utilisation du ratio 'courrier_co_par_sac'
                     ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source # Fallback
                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CO-ACP-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 2 : Départ Axes ---
        elif "DÉPART AXES" in famille or "DEPART AXES" in famille:
            # Source : AGREGAT CO ARRIVEE (PART + PRO)
            vol_aggregat = context.get_aggregated_volume("CO", "ARRIVEE")
            
            # Application du facteur %Axes Arrivée
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            vol_source = vol_aggregat * pct_axes
            ui_path = f"CO.ARRIVEE.AGREGAT x {pct_axes:.2%}(Axes)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                if unite in ["SAC", "SACS"]:
                     # Utilisation du ratio 'courrier_co_par_sac'
                     ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source 
                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CO-DA-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 3 : Distribution Locale ---
        elif "DISTRIBUTION LOCALE" in famille:
            
            # Sub-cas Spécifique : Tâche 'Distribution', Base 100, Unité 'COURRIER'
            is_distrib_task = "DISTRIBUTION" in tache.nom_tache.upper()
            is_affectation_task = "AFFECTATION AUX FACTEURS" in tache.nom_tache.upper()
            is_courrier_unit = unite in ["COURRIER", "COURRIERS", "LETTRE", "LETTRES", "PLI", "PLIS"]
            
            # Source commune : AGREGAT CO ARRIVEE (PART + PRO)
            vol_aggregat = context.get_aggregated_volume("CO", "ARRIVEE")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
            
            vol_source_base = vol_aggregat * facteur_local
            
            # --- CAS SPECIFIQUE : AFFECTATION AUX FACTEURS ---
            if is_affectation_task and base_val == 100:
                # Regle: base_calcul * moyenne_minute * effectif_facteur
                # Ici volume_annuel = effectif_actuel (multiplié plus tard par 1.0 * moyenne_min)
                # On triche un peu sur le concept de volume annuel, on retourne l'effectif direct
                # Mais attention, l'effectif n'est pas "annuel".
                # La formule finale est: MoyenneMin * Effectif.
                # Donc si on retourne Volume = Effectif, on aura: Effectif * MoyenneMin.
                # Cependant, volume_jour = volume_annuel / nb_jours.
                # Si on veut (MoyMin * Effectif) par JOUR, alors volume_jour doit etre = Effectif.
                # Donc volume_annuel doit être = Effectif * nb_jours.
                
                effectif_fd = context.get_effectif_facteur_distributeur()
                volume_annuel = effectif_fd * nb_jours
                ui_path = f"Effectif Facteur Distributeur ({effectif_fd})"
                ui_path += " [Special: Affec. Facteurs]"
                
            elif is_distrib_task and base_val == 100 and is_courrier_unit:
                # Formule Complexe : Vol * (1-Axes) * Cplx_Circ * Cplx_Geo
                taux_complexite = context.raw_volumes.taux_complexite or 1.0
                nature_geo = context.raw_volumes.nature_geo or 1.0
                
                volume_annuel = vol_source_base * taux_complexite * nature_geo
                ui_path = f"CO.ARRIVEE.AGREGAT x {facteur_local:.2%}(1-Ax) x {taux_complexite}(Cplx) x {nature_geo}(Geo)"
                ui_path += " [Base 100% / Courrier / Dist]"
            
            elif base_val == 100 and unite == "FACTEUR":
                # Cas Unité Facteur : Division par 350 (ex: Tri Facteur)
                # Formule: Vol * (1 - %Axes) / 350
                ratio_facteur = 350.0
                volume_annuel = vol_source_base / ratio_facteur
                facteur_conversion = 1.0 / ratio_facteur
                ui_path = f"CO.ARRIVEE.AGREGAT x {facteur_local:.2%}(1-Ax)"
                ui_path += f" [Base 100% / Facteur (Ratio={ratio_facteur})]"

            else:
                # Logique Standard pour le reste de la famille
                # Ex: Base 100 Sac, Base 40, etc.
                vol_source = vol_source_base
                ui_path = f"CO.ARRIVEE.AGREGAT x {facteur_local:.2%}(Local)"
                
                # --- CAS 1 : BASE 100 ---
                if base_val == 100:
                    if unite in ["SAC", "SACS"]:
                         ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                         if ratio > 0:
                            volume_annuel = vol_source / ratio
                            facteur_conversion = 1.0 / ratio
                            ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                         else:
                            volume_annuel = vol_source 
                    else:
                        volume_annuel = vol_source
                        ui_path += " [Base 100%]"
                
                # --- CAS 2 : BASE 60 ---
                elif base_val == 60:
                     if unite in ["SAC", "SACS"]:
                         ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                         if ratio > 0:
                            volume_annuel = vol_source / ratio
                            facteur_conversion = 1.0 / ratio
                            ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                         else:
                            volume_annuel = 0.0
                     else:
                         volume_annuel = vol_source
                         ui_path += " [Base 60%]"
                
                # --- CAS 3 : BASE 40 ---
                elif base_val == 40:
                     volume_annuel = vol_source
                     ui_path += " [Base 40%]"

                else:
                     return 0.0, 0.0, 1.0, f"N/A (CO-DL-Base={base_val}/Unit={unite})"
        
        # Calcul journalier commun (CO Arrivé)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path

    # --- FIN BLOC CO ARRIVE (VERROUILLE) ---

    # ---------------------------------------------------------
    # 4. PRODUIT: CO DEPART (ou CO MED)
    # ---------------------------------------------------------
    elif produit in ["CO DEPART", "CO DÉPART", "CO MED", "COURRIER ORDINAIRE DEPART", "COURRIER ORDINAIRE MED"]:
        log_trace(f"📮 BLOC CO DEPART: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Arrivée Camions Axes ---
        if "ARRIVÉE CAMIONS AXES" in famille or "ARRIVEE CAMIONS AXES" in famille:
            # Source : VOLUME GLOBAL CO DEPART
            vol_aggregat = context.get_volume("CO", "DEPART", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_depart or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            vol_source = vol_aggregat * pct_axes
            ui_path = f"CO.DEPART.GLOBAL x {pct_axes:.2%}(AxesD)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                if unite in ["SAC", "SACS"]:
                     # Utilisation du ratio 'courriers_co_par_sac'
                     ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source 
                elif unite in ["PART", "PARTS"]:
                     # Cas Spécifique Unité 'Part' (Forfaitaire ?)
                     # Demande : moyenne_minute * base_calcul
                     # Pour obtenir cela, il faut que volume_jour = 1.0
                     # Donc volume_annuel = nb_jours
                     volume_annuel = float(nb_jours)
                     ui_path = "Forfait 1/j (Unité=Part)"
                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CO-ACA-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 2 : Départ Camion Principal ---
        elif "DÉPART CAMION PRINCIPAL" in famille or "DEPART CAMION PRINCIPAL" in famille:
            # Source : VOLUME GLOBAL CO DEPART
            vol_source = context.get_volume("CO", "DEPART", "GLOBAL")
            ui_path = "CO.DEPART.GLOBAL"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                if unite in ["SAC", "SACS"]:
                     ratio = getattr(context.raw_volumes, 'courriers_co_par_sac', 0) or 4500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source 
                
                elif unite in ["FACTEUR", "FACTEURS"]:
                     # Cas Unité Facteur : MoyenneMin * Effectif
                     effectif_fd = context.get_effectif_facteur_distributeur()
                     if tache.id == 12692:
                         print(f"✅ SPECIFIC TASK 12692 (CO IMPRESSION): Unit={unite} Base={base_val}. Applying Effectif FD ({effectif_fd}).")
                     
                     volume_annuel = effectif_fd * nb_jours
                     ui_path = f"Effectif Facteur Distributeur ({effectif_fd})"
                     ui_path += " [Unité=Facteur / DCP]"
                
                elif unite in ["DEPECHE", "DÉPECHE", "DEPÊCHE", "DÉPÊCHE"]:
                     # Cas Unité Dépêche : Forfaitaire (MoyenneMin * 1)
                     volume_annuel = float(nb_jours)
                     ui_path = "Forfait 1/j (Unité=Dépêche)"

                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CO-DCP-Base={base_val}/Unit={unite})"

        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (CO Départ)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CO DEPART (VERROUILLE) ---

    # ---------------------------------------------------------
    # 5. PRODUIT: CR ARRIVE
    # ---------------------------------------------------------
    elif produit in ["CR ARRIVE", "CR ARRIVÉ", "COURRIER RECOMMANDE ARRIVE", "COURRIER RECOMMANDÉ ARRIVÉ"]:
        log_trace(f"📨 BLOC CR ARRIVE: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        if "Comptage Colis" in tache.nom_tache:
             print(f"DEBUG_IN_CR_ARRIVE: {tache.nom_tache} PROD={produit} BASE={base_val} UNIT={unite}")

        # --- BRANCHE 0 (PRIORITAIRE) : Comptage / Rapprochement ---
        if ("COMPTAGE" in tache.nom_tache.upper() or "RAPPROCHEMENT" in tache.nom_tache.upper()):
             # Hypothèse : S'applique sur tout le flux Arrivée (Global)
             vol_source = context.get_volume("CR", "ARRIVEE", "GLOBAL")
             ui_path = "CR.ARRIVEE.GLOBAL (Spec: Cpt/Rapp)"
             
             if base_val == 60:
                 if unite in ["CAISSON", "CAISSONS"]:
                     ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
             else:
                 volume_annuel = vol_source
                 ui_path += f" [Base {base_val}%]"
        
        # --- BRANCHE 1 : Arrivée Camion Principal ---
        elif "ARRIVÉE CAMION PRINCIPAL" in famille or "ARRIVEE CAMION PRINCIPAL" in famille:
            # Source : VOLUME GLOBAL CR ARRIVEE
            vol_source = context.get_volume("CR", "ARRIVEE", "GLOBAL")
            ui_path = "CR.ARRIVEE.GLOBAL (DEBUG)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                # TODO: Ajouter ratio Caisson si nécessaire
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60 and unite in ["CAISSON", "CAISSONS"]:
                 ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0

            # --- CAS 3 : BASE 40 ---
            elif base_val == 40 and unite in ["COURRIER", "COURRIERS"]:
                 # Demande specifique: Base 40 + Unite Courrier (Standard Base 40)
                 volume_annuel = vol_source
                 ui_path += " [Base 40% / Courrier]"
            
            elif base_val == 40:
                 # Standard Base 40
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-ACP-Base={base_val}/Unit={unite})"

        # --- BRANCHE 2 : Départ Axes ---
        elif "DÉPART AXES" in famille or "DEPART AXES" in famille:
            # Source : VOLUME GLOBAL CR ARRIVEE
            vol_aggregat = context.get_volume("CR", "ARRIVEE", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            vol_source = vol_aggregat * pct_axes
            ui_path = f"CR.ARRIVEE.GLOBAL x {pct_axes:.2%}(Axes)"
            
            # --- CAS 1 : BASE 100 (Standard) ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60 and unite in ["CAISSON", "CAISSONS"]:
                 ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0

            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-DA-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 3 : Distribution Locale ---
        elif "DISTRIBUTION LOCALE" in famille:
            # Source : VOLUME GLOBAL CR ARRIVEE
            vol_aggregat = context.get_volume("CR", "ARRIVEE", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
                
            vol_source = vol_aggregat * facteur_local
            ui_path = f"CR.ARRIVEE.GLOBAL x {facteur_local:.2%}(Local)"
            
            # --- CAS 1 : BASE 100 (Standard) ---
            if base_val == 100:
                is_retour_info = "RETOUR INFO FACTEUR" in tache.nom_tache.upper()
                is_distrib_task = "DISTRIBUTION" in tache.nom_tache.upper()
                is_unite_courrier = unite in ["COURRIER", "COURRIERS", "LETTRE", "LETTRES", "PLI", "PLIS"]
                
                if is_retour_info and is_unite_courrier:
                    # Règle specifique : / 350
                    ratio_spec = 350.0
                    volume_annuel = vol_source / ratio_spec
                    facteur_conversion = 1.0 / ratio_spec
                    ui_path += f" [Spec: RetourInfo / 350]"
                
                elif is_distrib_task and is_unite_courrier:
                    # Règle specifique Distribution : Complexités
                    taux_complexite = context.raw_volumes.taux_complexite or 1.0
                    nature_geo = context.raw_volumes.nature_geo or 1.0
                    
                    volume_annuel = vol_source * taux_complexite * nature_geo
                    ui_path += f" x {taux_complexite}(Cplx) x {nature_geo}(Geo) [Spec: Dist/Courrier]"
                    
                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60:
                 if unite in ["CAISSON", "CAISSONS"]:
                     ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                     else:
                        volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"

            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-DL-Base={base_val}/Unit={unite})"


        # --- BRANCHE 4 : Guichet ---
        elif "GUICHET" in famille:
            # Source : VOLUME GLOBAL CR ARRIVEE * (1 - %Axes)
            # Meme logique que Distribution Locale pour le flux résiduel
            vol_aggregat = context.get_volume("CR", "ARRIVEE", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
            
            vol_source = vol_aggregat * facteur_local
            ui_path = f"CR.ARRIVEE.GLOBAL x {facteur_local:.2%}(Local)"
            
            # --- CAS 1 : BASE 100 (Standard) ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-Guichet-Base={base_val}/Unit={unite})"




        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (CR)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CR ARRIVE (VERROUILLE) ---

    # ---------------------------------------------------------
    # 6. PRODUIT: CR DEPART (ou CR MED)
    # ---------------------------------------------------------
    elif produit in ["CR DEPART", "CR DÉPART", "CR MED", "COURRIER RECOMMANDE DEPART", "COURRIER RECOMMANDÉ MED"]:
        log_trace(f"📫 BLOC CR DEPART: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # DEBUG: Vérifier si les tâches CR MED entrent ici
        if "ecriture" in tache.nom_tache.lower() and "CR" in produit:
            print(f"🔍 DEBUG_CR_DEPART: ID={tache.id} NOM='{tache.nom_tache}' PROD='{produit}' UNIT='{unite}' BASE={base_val}")
        
        # --- BRANCHE 1 : Arrivée Camions Axes ---
        if "ARRIVÉE CAMIONS AXES" in famille or "ARRIVEE CAMIONS AXES" in famille:
            # Source : VOLUME GLOBAL CR DEPART
            vol_aggregat = context.get_volume("CR", "DEPART", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_depart or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                
            vol_source = vol_aggregat * pct_axes
            ui_path = f"CR.DEPART.GLOBAL x {pct_axes:.2%}(AxesD)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                # TODO: Ajouter ratio Caisson ou Part si besoin
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60 and unite in ["CAISSON", "CAISSONS"]:
                 ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0

            # --- CAS 3 : BASE 40 ---
            elif base_val == 40 and unite in ["COURRIER", "COURRIERS"]:
                 # Demande specifique
                 volume_annuel = vol_source
                 ui_path += " [Base 40% / Courrier]"
            
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-ACA-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 2 : Départ Camion Principal ---
        elif "DÉPART CAMION PRINCIPAL" in famille or "DEPART CAMION PRINCIPAL" in famille:
            # Source : VOLUME GLOBAL CR DEPART
            vol_source = context.get_volume("CR", "DEPART", "GLOBAL")
            ui_path = "CR.DEPART.GLOBAL"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                if unite in ["CAISSON", "CAISSONS"]:
                     ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Caisson (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source
                
                elif unite in ["DEPECHE", "DÉPECHE", "DEPÊCHE", "DÉPÊCHE"]:
                     # Cas Unité Dépêche : Forfaitaire (1 par jour)
                     volume_annuel = float(nb_jours)
                     ui_path = "Forfait 1/j (Unité=Dépêche)"
                     
                elif unite in ["SAC", "SACS"]:
                     # Note: utilisateur a demandé /cr_par_caisson même si unite=SAC (Legacy/Fallback)
                     ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Sac (Ratio={ratio})]"
                     else:
                        volume_annuel = vol_source 
                else:
                    volume_annuel = vol_source
                    ui_path += " [Base 100%]"
            
            # --- CAS 2 : BASE 60 ---
            elif base_val == 60 and unite in ["CAISSON", "CAISSONS"]:
                 ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                 if ratio > 0:
                    volume_annuel = vol_source / ratio
                    facteur_conversion = 1.0 / ratio
                    ui_path += f" [Base 60% / Caisson (Ratio={ratio})]"
                 else:
                    volume_annuel = 0.0

            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 if tache.id == 12678:
                     print(f"✅ SPECIFIC TASK 12678 (CR IMPRESSION): Unit={unite} Base={base_val}. Applying Vol * %Axes.")
                 
                 if "CONTROLE" in tache.nom_tache.upper() or "CONTRÔLE" in tache.nom_tache.upper():
                     # Tâche Contrôle : Global (MoyMin * Base * Vol)
                     volume_annuel = vol_source
                     ui_path += " [Base 40% / Contrôle (Global)]"
                 else:
                     # Standard Base 40 DCP : Global * %Axes
                     pct_axes = context.raw_volumes.pct_axes_depart or 0.0
                     if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                     
                     volume_annuel = vol_source * pct_axes
                     ui_path += f" x {pct_axes:.2%}(AxesD) [Base 40% (Std)]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-DCP-Base={base_val}/Unit={unite})"
        
        # --- BRANCHE 3 : Guichet ---
        elif "GUICHET" in famille:
            # Source : VOLUME GLOBAL CR DEPART
            vol_aggregat = context.get_volume("CR", "DEPART", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_depart or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
                
            vol_source = vol_aggregat * facteur_local
            ui_path = f"CR.DEPART.GLOBAL x {facteur_local:.2%}(NonAxes)"
            
            # --- CAS 1 : BASE 100 (Standard) ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (CR-Guichet-Base={base_val}/Unit={unite})"

        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (CR Départ)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CR MED/DEPART (VERROUILLE) ---

    # ---------------------------------------------------------
    # 7. PRODUIT: E-BARKIA ARRIVE
    # ---------------------------------------------------------
    elif produit in ["E-BARKIA ARRIVE", "E-BARKIA ARRIVÉ", "EBARKIA ARRIVE", "EBARKIA ARRIVÉ", "E BARKIA ARRIVE", "E BARKIA ARRIVÉ"]:
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Distribution Locale ---
        if "DISTRIBUTION LOCALE" in famille:
            # Source : VOLUME GLOBAL E-BARKIA ARRIVEE
            # (Utilisation du flux global sans filtre axes pour le moment, sauf si demandé plus tard)
            vol_source = context.get_volume("EB", "ARRIVEE", "GLOBAL")
            ui_path = "EBARKIA.ARRIVEE.GLOBAL"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (EB-DL-Base={base_val}/Unit={unite})"

        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (E-BARKIA)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # ---------------------------------------------------------
    # 8. PRODUIT: E-BARKIA DEPART
    # ---------------------------------------------------------
    elif produit in ["E-BARKIA DEPART", "E-BARKIA DÉPART", "EBARKIA DEPART", "EBARKIA DÉPART", "E BARKIA DEPART", "E BARKIA DÉPART"]:
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Distribution Locale (Mirroring Arrivée logic) ---
        if "DISTRIBUTION LOCALE" in famille:
            # Source : VOLUME GLOBAL E-BARKIA DEPART
            vol_source = context.get_volume("EB", "DEPART", "GLOBAL")
            ui_path = "EBARKIA.DEPART.GLOBAL"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (EB-Dep-DL-Base={base_val}/Unit={unite})"

        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (E-BARKIA D)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   â†’ CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC E-BARKIA DEPART (VERROUILLE) ---

    # ---------------------------------------------------------
    # 9. PRODUIT: C.VALEUR (ou Contre-Remboursement, etc.)
    # ---------------------------------------------------------
    # (A IMPLEMENTER)
    
    # 9. PRODUIT: LRH
    # ---------------------------------------------------------
    elif produit == "LRH":
        
        # Récupération de la base de calcul
        base_calcul = getattr(tache, 'base_calcul', 100)
        try:
            base_val = int(float(base_calcul or 100)) 
        except:
            base_val = 100
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Distribution Locale ---
        if "DISTRIBUTION LOCALE" in famille:
            # Source : VOLUME GLOBAL LRH (Arrivée par défaut)
            vol_source = context.get_volume("LRH", "ARRIVEE", "GLOBAL")
            ui_path = "LRH.ARRIVEE.GLOBAL"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            
            # --- CAS 3 : BASE 40 ---
            elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"

            else:
                 return 0.0, 0.0, 1.0, f"N/A (LRH-DL-Base={base_val}/Unit={unite})"

        else:
             return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun (LRH)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    return 0.0, 0.0, 1.0, "N/A"

# --- MOTEUR PRINCIPAL ---
def calculer_simulation_data_driven(
    db: Session,
    centre_poste_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    ed_percent: float = 0.0,
    debug: bool = False
) -> SimulationResponse:
    """
    Simulateur Data-Driven (Moteur Refondu)
    """
    print(f"--- SIMULATION (Clean Engine) ID={centre_poste_id} ---")
    
    # 0. Récupérer le CentrePoste et Centre pour le contexte
    cp_obj = db.query(CentrePoste).filter(CentrePoste.id == centre_poste_id).first()
    if not cp_obj:
        raise HTTPException(status_code=404, detail="CentrePoste not found")
    
    centre_id = cp_obj.centre_id
    
    # 🚨 INTERCEPTION CCI: Si Centre 1952, déléguer vers simulation_CCI.py
    if str(centre_id) == "1952":
        print("🚨 CENTRE CCI DÉTECTÉ (Poste) -> DÉLÉGATION VERS simulation_CCI.py")
        from app.services.simulation_CCI import calculate_cci_simulation
        from app.schemas.models import SimulationRequest, VolumesInput
        
        req = SimulationRequest(
            centre_id=centre_id,
            poste_id=cp_obj.poste_id,
            productivite=productivite,
            idle_minutes=idle_minutes,
            volumes_ui=[v.dict() for v in volumes_ui.volumes_flux],
            nbr_courrier_liasse=getattr(volumes_ui, 'nbr_courrier_liasse', 50.0),
            pct_retour=getattr(volumes_ui, 'pct_retour', 0.0),
            # CO/CR-specific parameters
            courriers_co_par_sac=getattr(volumes_ui, 'courriers_co_par_sac', 2500.0),
            courriers_cr_par_sac=getattr(volumes_ui, 'courriers_cr_par_sac', 500.0),
            nb_courrier_liasse_co=getattr(volumes_ui, 'nb_courrier_liasse_co', 500.0),
            nb_courrier_liasse_cr=getattr(volumes_ui, 'nb_courrier_liasse_cr', 500.0),
            pct_retour_co=getattr(volumes_ui, 'pct_retour_co', 1.0),
            pct_retour_cr=getattr(volumes_ui, 'pct_retour_cr', 1.0),
            annotes_co=getattr(volumes_ui, 'annotes_co', 0.0),
            annotes_cr=getattr(volumes_ui, 'annotes_cr', 0.0),
            pct_reclam_co=getattr(volumes_ui, 'pct_reclam_co', 0.0),
            pct_reclam_cr=getattr(volumes_ui, 'pct_reclam_cr', 0.0),
            courriers_par_sac=getattr(volumes_ui, 'courriers_par_sac', 4500.0),
            colis_amana_par_sac=getattr(volumes_ui, 'colis_amana_par_sac', 5.0),
            annotes=getattr(volumes_ui, 'annotes', 0.0),
            pct_reclamation=getattr(volumes_ui, 'pct_reclamation', 0.0)
        )
        req.volumes = VolumesInput(
            sacs=0, colis=0,
            courriers_par_sac=getattr(volumes_ui, 'courriers_par_sac', 4500.0),
            colis_amana_par_sac=getattr(volumes_ui, 'colis_amana_par_sac', 5.0)
        )
        return calculate_cci_simulation(db, req)
    
    # 1. Init Context
    ctx = VolumeContext(volumes_ui, centre_id=centre_id, db=db)

    
    # 2. Get Tasks
    taches = db.query(Tache).filter(
        Tache.centre_poste_id == centre_poste_id,
    Tache.centre_poste_id == centre_poste_id
    ).all()
    
    taches_actives = []
    print(f"DEBUG: Checking {len(taches)} tasks for CentrePoste {centre_poste_id}")
    for t in taches:
        # Debug spécifique pour les tâches suspectes
        if "Rapprochement" in (t.nom_tache or "") or "Comptage" in (t.nom_tache or ""):
            print(f"FOUND SUSPECT TASK: {t.nom_tache} Etat={t.etat} Prod={t.produit}")
            
        if t.etat != 'NA' or ("Rapprochement" in (t.nom_tache or "")) or ("Comptage" in (t.nom_tache or "")):
            if t.etat == 'NA':
                print(f"⚠️ FORCING INCLUSION OF NA TASK: {t.nom_tache}")
            taches_actives.append(t)
    
    taches = taches_actives
    
    print(f"Found {len(taches)} tasks.")
    
    details_taches = []
    total_heures = 0.0
    heures_net_jour = max(0.0, heures_par_jour - (idle_minutes / 60.0))
    
    # 3. Process Tasks
    for tache in taches:
        # Appel logique unitaire
        vol_annuel, vol_jour, facteur, path = calculer_volume_applique(tache, ctx)
        
        # DEBUG: Log détaillé pour "impression borderau"
        if "impression" in tache.nom_tache.lower():
            print(f"🔍 APRÈS CALCUL: ID={tache.id} '{tache.nom_tache}' PROD='{getattr(tache, 'produit', 'N/A')}'")
            print(f"   → vol_annuel={vol_annuel:.2f}, vol_jour={vol_jour:.2f}")
            print(f"   → path='{path}'")
        
        # Ignorer si volume nul
        if vol_jour <= 0:
            print(f"⚠️ SKIPPING TASK (vol=0): ID={tache.id} '{tache.nom_tache}' PROD='{getattr(tache, 'produit', 'N/A')}'")
            continue
            
        # Calcul temps
        moyenne_min = float(tache.moyenne_min or 0.0)
        minutes_jour = vol_jour * moyenne_min
        heures_tache = (minutes_jour / 60.0)
        
        # Application Productivité
        if productivite and productivite > 0:
             heures_tache = heures_tache * (100.0 / productivite)
        
        total_heures += heures_tache
        
        # Création Detail
        nom_tache = tache.nom_tache or "Sans nom"
        


        unite = tache.unite_mesure or ""
        
        # Récupération des métadonnées pour le frontend
        base_calcul_val = getattr(tache, 'base_calcul', None)
        try:
            base_calcul_int = int(float(base_calcul_val)) if base_calcul_val else None
        except:
            base_calcul_int = None
            
        produit_str = str(getattr(tache, 'produit', '') or '').strip()
        
        detail = TacheDetail(
            id=tache.id,  # 🆕 Matching par ID
            task=nom_tache,
            phase=tache.phase or "N/A",
            unit=unite,
            base_calcul=base_calcul_int,  # 🆕 Base pour affichage frontend
            produit=produit_str if produit_str else None,  # 🆕 Produit pour différenciation
            avg_sec=moyenne_min * 60.0,
            heures=round(heures_tache, 4),
            nombre_unite=round(vol_jour, 2),
            formule=f"Vol={vol_jour:.1f} ({produit_str or 'N/A'}: {path}) × {moyenne_min:.2f}min [Unit={unite}, Base={base_calcul_int}%]",
            poste_id=tache.centre_poste.poste_id if tache.centre_poste else None,
            centre_poste_id=centre_poste_id
        )
        if "Comptage Colis" in nom_tache or "Rapprochement" in nom_tache:
             print(f"DEBUG_APPEND: {nom_tache} Vol={vol_jour} Hrs={heures_tache}")

        details_taches.append(detail)

    # 4. Result Construction
    fte_calcule = total_heures / heures_net_jour if heures_net_jour > 0 else 0.0
    fte_arrondi = round(fte_calcule) # Simple round for now
    
    return SimulationResponse(
        details_taches=details_taches,
        total_heures=total_heures,
        heures_net_jour=heures_net_jour,
        fte_calcule=fte_calcule,
        fte_arrondi=fte_arrondi,
        heures_par_poste={centre_poste_id: total_heures}
    )

# --- POINT D'ENTREE SECONDAIRE (CENTRE) ---
# Si l'ancien code appelait cette fonction, on la définit comme alias ou variante
def calculer_simulation_centre_data_driven(
    db: Session,
    centre_id: int,
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    ed_percent: float = 0.0,
    colis_amana_par_sac: float = 5.0,
    debug: bool = False,
    poste_id_filter: int = None
) -> SimulationResponse:
    print(f"--- SIMULATION CENTRE (Clean Engine) ID={centre_id} ---")

    # 🚨 INTERCEPTION CCI: Si Centre 1952, déléguer vers simulation_CCI.py
    if str(centre_id) == "1952":
        print("🚨 CENTRE CCI DÉTECTÉ (Centre) -> DÉLÉGATION VERS simulation_CCI.py")
        from app.services.simulation_CCI import calculate_cci_simulation
        from app.schemas.models import SimulationRequest, VolumesInput
        
        req = SimulationRequest(
            centre_id=centre_id,
            poste_id=poste_id_filter,  # None pour tout le centre
            productivite=productivite,
            idle_minutes=idle_minutes,
            volumes_ui=[v.dict() for v in volumes_ui.volumes_flux],
            nbr_courrier_liasse=getattr(volumes_ui, 'nbr_courrier_liasse', 50.0),
            pct_retour=getattr(volumes_ui, 'pct_retour', 0.0),
            # CO/CR-specific parameters
            courriers_co_par_sac=getattr(volumes_ui, 'courriers_co_par_sac', 2500.0),
            courriers_cr_par_sac=getattr(volumes_ui, 'courriers_cr_par_sac', 500.0),
            nb_courrier_liasse_co=getattr(volumes_ui, 'nb_courrier_liasse_co', 500.0),
            nb_courrier_liasse_cr=getattr(volumes_ui, 'nb_courrier_liasse_cr', 500.0),
            pct_retour_co=getattr(volumes_ui, 'pct_retour_co', 1.0),
            pct_retour_cr=getattr(volumes_ui, 'pct_retour_cr', 1.0),
            annotes_co=getattr(volumes_ui, 'annotes_co', 0.0),
            annotes_cr=getattr(volumes_ui, 'annotes_cr', 0.0),
            pct_reclam_co=getattr(volumes_ui, 'pct_reclam_co', 0.0),
            pct_reclam_cr=getattr(volumes_ui, 'pct_reclam_cr', 0.0),
            courriers_par_sac=getattr(volumes_ui, 'courriers_par_sac', 4500.0),
            colis_amana_par_sac=getattr(volumes_ui, 'colis_amana_par_sac', 5.0),
            annotes=getattr(volumes_ui, 'annotes', 0.0),
            pct_reclamation=getattr(volumes_ui, 'pct_reclamation', 0.0)
        )
        req.volumes = VolumesInput(
            sacs=0, colis=0,
            courriers_par_sac=getattr(volumes_ui, 'courriers_par_sac', 4500.0),
            colis_amana_par_sac=colis_amana_par_sac
        )
        return calculate_cci_simulation(db, req)

    # 1. Récupérer les postes du centre
    query = db.query(CentrePoste).filter(CentrePoste.centre_id == centre_id)
    if poste_id_filter:
        query = query.filter(CentrePoste.poste_id == poste_id_filter)
    
    centre_postes = query.all()
    
    if not centre_postes:
         print(f"Aucun poste trouvé pour le centre {centre_id}")
         return SimulationResponse(
            details_taches=[], total_heures=0, heures_net_jour=8, fte_calcule=0, fte_arrondi=0, heures_par_poste={}
        )

    # 2. Init global accumulators
    aggregated_details = []
    global_total_heures = 0.0
    heures_par_poste = {}
    
    # 3. Iterate and calculate
    for cp in centre_postes:
        # On délègue le calcul unitaire à la fonction principale (plus simple et réutilise la logique)
        # Note: volumes_ui contient déjà raw_volumes. ed_percent est passé.
        try:
            res_poste = calculer_simulation_data_driven(
                db=db,
                centre_poste_id=cp.id,
                volumes_ui=volumes_ui,
                productivite=productivite,
                heures_par_jour=heures_par_jour,
                idle_minutes=idle_minutes,
                ed_percent=ed_percent,
                debug=debug
            )
            
            # Aggregate results
            aggregated_details.extend(res_poste.details_taches)
            global_total_heures += res_poste.total_heures
            heures_par_poste[cp.id] = res_poste.total_heures
            
        except Exception as e:
            print(f"Erreur calcul poste {cp.id}: {str(e)}")
            continue

    # 4. Result Construction
    heures_net_jour = max(0.0, heures_par_jour - (idle_minutes / 60.0))
    fte_calcule = global_total_heures / heures_net_jour if heures_net_jour > 0 else 0.0
    fte_arrondi = round(fte_calcule) # Simple round

    # Calcul détaillé par poste pour le frontend (PosteResultat)
    etp_par_poste = {}
    liste_postes_res = []

    for cp in centre_postes:
        heures = heures_par_poste.get(cp.id, 0.0)
        etp = heures / heures_net_jour if heures_net_jour > 0 else 0.0
        etp_par_poste[cp.id] = etp
        
        # Sécurisation label poste
        lbl = "Poste Inconnu"
        if cp.poste and cp.poste.label:
             lbl = cp.poste.label
        elif cp.poste_id:
             lbl = f"Poste {cp.poste_id}"
             
        liste_postes_res.append(PosteResultat(
            id=cp.id,
            centre_poste_id=cp.id,
            poste_label=lbl,
            etp_calcule=etp,
            etp_arrondi=int(round(etp)),
            total_heures=heures,
            effectif_actuel=float(cp.effectif_actuel or 0),
            ecart=float(cp.effectif_actuel or 0) - etp,
            type_poste=cp.poste.type_poste if (cp.poste and cp.poste.type_poste) else "MOD"
        ))
    
    return SimulationResponse(
        details_taches=aggregated_details,
        total_heures=global_total_heures,
        heures_net_jour=heures_net_jour,
        fte_calcule=fte_calcule,
        fte_arrondi=fte_arrondi,
        heures_par_poste=heures_par_poste,
        etp_par_poste=etp_par_poste,
        postes=liste_postes_res  # 🆕 Liste complète pour le frontend
    )

def calculer_simulation_multi_centres_data_driven(
    db: Session,
    centre_ids: list[int],
    volumes_ui: VolumesUIInput,
    productivite: float = 100.0,
    heures_par_jour: float = 8.0,
    idle_minutes: float = 0.0,
    debug: bool = False
) -> SimulationResponse:
    # Placeholder for multi-centre simulation
    print("Simulation MULTI-CENTRES non implémentée dans le moteur refondu pour l'instant.")
    return SimulationResponse(
        details_taches=[], total_heures=0, heures_net_jour=8, fte_calcule=0, fte_arrondi=0, heures_par_poste={}
    )

