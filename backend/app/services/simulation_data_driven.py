import math
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
        self.grid_values = volumes_ui.grid_values or {}

    def get_grid_volume_by_product(self, produit: str) -> float:
        """
        Récupère le volume depuis la grille (grid_values) en fonction du nom du produit.
        Logique adaptée de bandoeng_engine pour l'unification.
        """
        if not self.grid_values:
            return 0.0

        p = produit.upper().strip() if produit else ""
        g = self.grid_values

        def val(path_list):
            curr = g
            for k in path_list:
                if isinstance(curr, dict) and k in curr:
                    curr = curr[k]
                else:
                    return 0.0
            try:
                # Handle possible string formatting in grid values
                if isinstance(curr, str):
                   curr = curr.replace(',', '.').replace(' ', '').replace('%', '').strip()
                   if not curr: return 0.0
                return float(curr)
            except:
                return 0.0

        # --- LOGIQUE IDENTIQUE A BANDOENG ENGINE ---
        
        # Flux AMANA
        if "AMANA" in p:
            if "RECU" in p or "REÇU" in p or "ARRIVEE" in p or "ARRIVÉ" in p:
                if "INTERNATIONAL" in p: return val(['amana', 'import', 'international'])
                if "NATIONAL" in p: return val(['amana', 'import', 'national'])
                if "LOCAL" in p: return val(['amana', 'import', 'local']) # Souvent 0
                return val(['amana', 'import', 'national']) + val(['amana', 'import', 'international']) # Default Arrivé

            if "DEPART" in p or "DÉPART" in p:
                if "GUICHET" in p: return val(['amana', 'export', 'guichet'])
                if "COLLECTE" in p: return val(['amana', 'export', 'collecte'])
                # Default Depart = Guichet + Collecte
                return val(['amana', 'export', 'guichet']) + val(['amana', 'export', 'collecte'])

        # Courrier Ordinaire (CO)
        if "COURRIER ORDINAIRE" in p or "ORDINAIRE" in p:
            if "ARRIVEE" in p or "REÇU" in p or "RECU" in p:
                if "INTERNATIONAL" in p: return val(['courrier_ordinaire', 'import', 'international'])
                if "NATIONAL" in p: return val(['courrier_ordinaire', 'import', 'national'])
                # Cas spécial : CO Arrivé (Somme Local + Axes) selon Bandoeng
                # Mais ici on reste générique. Bandoeng dit: Local + Axes
                return val(['courrier_ordinaire', 'import', 'local']) + val(['courrier_ordinaire', 'import', 'axes'])

            if "DEPART" in p or "DÉPART" in p:
                if "COLLECTE" in p: return val(['courrier_ordinaire', 'export', 'collecte'])
                if "GUICHET" in p: return val(['courrier_ordinaire', 'export', 'guichet'])
                if "BOITE" in p: return val(['courrier_ordinaire', 'export', 'boites_lettres'])
                # Total Depart
                return val(['courrier_ordinaire', 'export', 'guichet']) + \
                       val(['courrier_ordinaire', 'export', 'boites_lettres']) + \
                       val(['courrier_ordinaire', 'export', 'collecte'])

        # Courrier Recommandé (CR)
        if "COURRIER RECOMMANDE" in p or "RECOMMANDÉ" in p or " R " in p:
             if "ARRIVEE" in p or "REÇU" in p or "RECU" in p:
                 if "INTERNATIONAL" in p: return val(['courrier_recommande', 'import', 'international'])
                 if "NATIONAL" in p: return val(['courrier_recommande', 'import', 'national'])
                 return val(['courrier_recommande', 'import', 'local']) + val(['courrier_recommande', 'import', 'axes']) # Default

             if "DEPART" in p or "DÉPART" in p:
                 if "COLLECTE" in p: return val(['courrier_recommande', 'export', 'collecte'])
                 if "GUICHET" in p: return val(['courrier_recommande', 'export', 'guichet'])
                 return val(['courrier_recommande', 'export', 'guichet']) + val(['courrier_recommande', 'export', 'collecte'])

        # E-Barkia
        if "BARKIA" in p:
             if "MED" in p or "DÉPART" in p or "DEPART" in p: return val(['ebarkia', 'med'])
             if "ARRIVEE" in p or "ARRIVÉ" in p or "RECU" in p: return val(['ebarkia', 'arrive'])
             return val(['ebarkia', 'med']) # Default

        # LRH
        if "LRH" in p:
             if "MED" in p or "DÉPART" in p or "DEPART" in p: return val(['lrh', 'med'])
             if "ARRIVEE" in p or "ARRIVÉ" in p or "RECU" in p: return val(['lrh', 'arrive'])
             return val(['lrh', 'med']) # Default

        return 0.0

    def get_volume(self, flux: str, sens: str, segment: str = "GLOBAL") -> float:
        """
        Récupère un volume par son code flux/sens/segment depuis la liste plate volumes_flux.
        """
        # ... existing implementation ...
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
    
    def get_guichet_volume(self, type_guichet: str) -> float:
        """
        Récupère un volume GUICHET (DEPOT ou RECUP) depuis raw_volumes.guichet.
        Les volumes GUICHET ne sont pas dans volumes_flux, ils sont dans un objet séparé.
        """
        if not self.raw_volumes.guichet:
            return 0.0
        
        type_guichet = type_guichet.upper()
        
        if type_guichet == "DEPOT":
            return float(getattr(self.raw_volumes.guichet, 'depot', 0) or 0)
        elif type_guichet in ["RECUP", "RECUPERATION"]:
            return float(getattr(self.raw_volumes.guichet, 'recup', 0) or 0)
        
        return 0.0

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
def parse_base_calcul(val: Any) -> int:
    """
    Parses the base_calcul field, handling strings with '%' (e.g. '100%')
    and converting to integer (e.g. 100). Defaults to 100 on error.
    """
    try:
        if isinstance(val, str):
            # Remove % and whitespace
            val = val.replace('%', '').strip()
        # Convert to float first (handles "100.0"), then int
        return int(float(val or 100))
    except:
        return 100

def _calculer_volume_raw(tache: Any, context: VolumeContext) -> tuple:
    """
    Calcule le volume à appliquer pour une tâche donnée.
    Returns:
        (volume_annuel, volume_journalier, facteur_conversion, ui_path)
    """
    produit = str(getattr(tache, 'produit', '') or '').strip().upper()
    unite = str(getattr(tache, 'unite_mesure', '') or '').strip().upper()
    phase = str(getattr(tache, 'phase', '') or '').strip().upper() # 🆕 Lecture Phase
    base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100)) # 🆕 Lecture Base
    
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

    # 🆕 INTEGRATION GRILLE UNIFIEE (Prioritaire)
    if context.grid_values:
        vol_brut = context.get_grid_volume_by_product(produit)
        
        # Si on trouve un volume dans la grille, on l'utilise
        # Note: get_grid_volume_by_product retourne 0.0 si pas trouvé. 
        # Mais 0.0 peut être une vraie valeur. Comment savoir ?
        # On assume que si grid_values est présent, on DOIT l'utiliser pour tous les produits mappés.
        # Si le produit n'est pas mappé (ex: International), ça retourne 0 -> Correct.
        
        # 2. Conversion Annuel -> Journalier
        # Diviseur Jours (264 par défaut)
        div_jours = float(context.nb_jours_ouvres_an)
        if "day_350" in phase.lower(): div_jours = 350.0
        elif "day_24" in phase.lower(): div_jours = 24.0
        elif "retour_day_350" in phase.lower(): div_jours = 350.0
        
        vol_jour_brut = vol_brut / div_jours if div_jours > 0 else 0.0
        
        # 3. Facteur de Conversion (Diviseur Unitaire)
        divisor = 1.0
        if "CAISSON" in unite:
             divisor = float(context.nbr_cr_sac or 400.0)
        elif "SAC" in unite:
             if "AMANA" in produit: divisor = float(context.colis_amana_par_canva_sac or 35.0)
             elif "CR" in produit or "RECOMMANDE" in produit: divisor = float(context.nbr_cr_sac or 400.0)
             elif "CO" in produit or "ORDINAIRE" in produit: divisor = float(context.nbr_co_sac or 350.0)
        
        # Volume Journalier Net (avant Base)
        volume_jour = vol_jour_brut / divisor if divisor > 0 else 0.0
        
        # 4. Application Base Calcul
        # La fonction retourne le volume FINAL (avec base appliquée)
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        volume_final_annuel = vol_brut * facteur_base # ? Pas sûr si vol annuel doit avoir base. Legacy le fait line 558.
        
        # Troncature spécifique
        if "CHARGEMENT FACTEUR" in tache.nom_tache.upper() or "APPEL CLIENT" in tache.nom_tache.upper():
            volume_final_jour = int(volume_final_jour)

        facteur_conversion = (1.0 / divisor) * facteur_base
        
        return volume_final_annuel, volume_final_jour, facteur_conversion, f"GRID[{produit}] Base={base_val}% Div={divisor} PhaseDiv={div_jours}"

    nb_jours = context.nb_jours_ouvres_an
    
    # 🚫 EXCLUSION : Tâches inactives (N/A) 🚫
    etat_tache = str(getattr(tache, 'etat', '') or '').strip().upper()
    if etat_tache == 'N/A':
         return 0.0, 0.0, 1.0, "EXCLU (Etat=N/A)"

    
    # 🚫 EXCLUSION : CHEF DE CENTRE 🚫
    try:
        # Navigation sécurisée: Tache -> CentrePoste -> Poste -> Label
        cp = getattr(tache, 'centre_poste', None)
        p = getattr(cp, 'poste', None) if cp else None
        p_label = str(getattr(p, 'label', '') or '').strip().upper()
        
        if p_label == "CHEF DE CENTRE COURRIER COLIS DE BAM CATEGORIE C" or "CHEF D'AGENCE" in p_label:
             return 0.0, 0.0, 1.0, "EXCLU (Chef de Centre / Chef d'Agence)"
    except Exception:
        pass
    
    
    # 🔍 DEBUG: Log pour toutes les tâches DEPOT/GUICHET
    if "AGENT TRAITEMENT" in p_label:
        print(f"\n🕵️ [TRACE AGENT TRAITEMENT] Processing Task ID={getattr(tache, 'id', '?')}")
        print(f"   Nom: '{tache.nom_tache}'")
        print(f"   Produit: '{produit}'")
        print(f"   Famille: '{getattr(tache, 'famille_uo', '')}'")
        print(f"   Base Calcul: {getattr(tache, 'base_calcul', 'N/A')}")
        print(f"   Unite: '{unite}'")

    if "DEPOT" in produit or "DÉPÔT" in produit:
        famille_debug = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        if "GUICHET" in famille_debug:
            produit_original = str(getattr(tache, 'produit', '') or '').strip()
            print(f"\n{'='*80}")
            print(f"🔍 [DEBUG DEPOT/GUICHET] Tâche ID={getattr(tache, 'id', '?')}")
            print(f"   Nom: {tache.nom_tache}")
            print(f"   Produit ORIGINAL (BDD): '{produit_original}'")
            print(f"   Produit NORMALISÉ: '{produit}'")
            print(f"   Famille: '{famille_debug}'")
            print(f"   Unité: '{unite}'")
            print(f"   Contient 'INTERNATIONAL': {'INTERNATIONAL' in produit_original.upper()}")
            print(f"{'='*80}\n")
            
    if "CAMION" in produit or "AXE" in produit:
         print(f"🛑 DEBUG CAMION/AXE: Produit='{produit}' Famille='{getattr(tache, 'famille_uo', '')}' Nom='{tache.nom_tache}'")
    
    # ---------------------------------------------------------
    # 1. PRODUIT: AMANA REÇU (ou AMANA ARRIVÉ)
    # ---------------------------------------------------------
    # ---------------------------------------------------------
    if produit in ["AMANA RECU", "AMANA REÇU", "AMANA ARRIVÉ", "AMANA ARRIVE"]:
        print("🔥🔥🔥 BLOC AMANA RECU NOUVELLE VERSION V2 🔥🔥🔥")
        log_trace(f"📦 BLOC AMANA RECU: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
            
            ui_path = f"AMANA.ARR.AGR x {facteur_local:.2%}(1-Ax)"

            # Règle Spécifique : Déchargement Facteur = 5% du Flux Local
            if "DECHARGEMENT FACTEUR" in tache.nom_tache.upper() or "DÉCHARGEMENT FACTEUR" in tache.nom_tache.upper():
                 vol_source = vol_source * 0.05
                 ui_path += " x 0.05(Dech.Fact)"
            
            # Règle Spécifique : Chargement Facteur / Appel Client (AMANA REÇU)
            elif "CHARGEMENT FACTEUR" in tache.nom_tache.upper() or "APPEL CLIENT" in tache.nom_tache.upper():
                 vol_source = int(vol_source)
                 # Pas de modification du path, on garde la logique (1-Ax)

            # Règle Spécifique : Distribution (AMANA RECU) - Afficher Complexité dans le Path
            elif "DISTRIBUTION" == (tache.nom_tache or "").upper().replace("É", "E").replace("È", "E").strip():
                 c_geo = context.raw_volumes.nature_geo or 1.0
                 c_circ = context.raw_volumes.taux_complexite or 1.0
                 
                 # LOG ANALYSE APPROFONDIE
                 vol_prev = vol_source
                 # Note: Le code actuel NE SEMBLE PAS multiplier vol_source par les params.
                 # On loggue l'état pour confirmer ce comportement au user.
                 # Si modification requise, il faudrait: vol_source = vol_source * c_geo * c_circ
                 
                 # Modification: Application réelle des paramètres
                 vol_source = vol_source * c_geo * c_circ
                 
                 print(f"📊 [DISTRIBUTION DEEP DIVE] Tache: '{tache.nom_tache}'")
                 print(f"   -> Params: Geo={c_geo}, Circ={c_circ}")
                 print(f"   -> Volume Source (Avant): {vol_prev}")
                 print(f"   -> Volume Source (Après CORRECTION): {vol_source}")
                 print("   ✅ CORRECTION: Paramètres appliqués.")

                 ui_path += f" * Geo({c_geo}) * Circ({c_circ})"

            # Règle Spécifique : Etats non distribué - Appliquer % Retour
            elif "ETATS NON DISTRIBUE" in tache.nom_tache.upper().replace("É", "E").replace("È", "E"):
                 print(f"🔄 [LOG ANALYSE RETOUR] Tache: {tache.nom_tache}, Volume Avant: {vol_source}, %Retour lu: {context.raw_volumes.pct_retour}")
                 pct_ret = float(context.raw_volumes.pct_retour or 0.0)
                 vol_source = vol_source * (pct_ret / 100.0)
                 print(f"🔄 [LOG ANALYSE RETOUR] Volume Après: {vol_source}")
                 ui_path += f" x {pct_ret:.2f}%(Retour)"
            
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
                vol_source_base = vol_guichet_recu
                ui_path = f"AMANA.GUICHET.RECU ({vol_guichet_recu:.0f})"
            else:
                # Fallback: Arrivée Local comme Distribution Locale
                vol_aggregat = context.get_aggregated_volume("AMANA", "ARRIVEE")
                pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
                if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                facteur_local = 1.0 - pct_axes
                
                vol_source_base = vol_aggregat * facteur_local
                ui_path = f"AMANA.ARR.AGR(Fallback) x {facteur_local:.2%}(1-Ax)"
            
            # Détection des tâches de Retrait/Récupération
            is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])
            
            # Application du % Retour pour les tâches de Retrait
            # SAUF pour la catégorie 'Centre de Traitement et Distribution' (id_categorie=10)
            is_ctd = False
            if context.db and context.centre_id:
                # Récupération sécurisée de la catégorie du centre courant
                try:
                    # CORRECTION: Utilisation de Centre.id et Centre.categorie_id (et non id_centre/id_categorie)
                    c = context.db.query(Centre).filter(Centre.id == context.centre_id).first()
                    print(f"🔍 [DEBUG RETRAIT] Centre Found: ID={context.centre_id}, CategorieID={getattr(c, 'categorie_id', 'None')}")
                    if c and c.categorie_id == 10:
                        is_ctd = True
                except Exception as e:
                    print(f"⚠️ Erreur vérification catégorie centre: {e}")

            if is_retrait and not is_ctd:
                pct_ret = float(context.raw_volumes.pct_retour or 0.0)
                vol_source = vol_source_base * (pct_ret / 100.0)
                ui_path += f" x {pct_ret:.2f}% (Retrait/Retour)"
            else:
                if is_retrait and is_ctd:
                     ui_path += " (Exclu CTD)"
                vol_source = vol_source_base
            
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
        
        # Règle Spécifique : Le volume journalier final pour Chargement Facteur/Appel Client doit être entier (tronqué)
        if "CHARGEMENT FACTEUR" in tache.nom_tache.upper() or "APPEL CLIENT" in tache.nom_tache.upper():
            volume_final_jour = int(volume_final_jour)
        
        print(f"   → AMANA RECU RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
        
    # ---------------------------------------------------------
    # 2A. PRODUIT: AMANA Dépôt International (NOUVEAU - Traitement spécifique)
    # ---------------------------------------------------------
    # ---------------------------------------------------------
    # 2A. PRODUIT: AMANA Dépôt International
    # Règle : Produit AMANA DEPOT + (Phase='INTERNATIONAL' ou 'INTERNATIONAL' dans Produit/Nom)
    elif "AMANA" in produit and ("DEPOT" in produit or "DÉPÔT" in produit) and (phase == "INTERNATIONAL" or "INTERNATIONAL" in produit or "INTERNATIONAL" in str(getattr(tache, 'nom_tache', '')).upper()):
        
        print(f"🌍 [INTL] ✅ MATCH BLOC 2A - Produit détecté via substring: '{produit}'")
        
        # 0. Normalisation
        famille = (tache.famille_uo or "").upper().strip()
        produit = (tache.produit or "").upper().strip()
        nom_tache = (tache.nom_tache or "").upper().strip()
        unite = (tache.unite_mesure or "").upper().strip()
        base_val = float(tache.base_calcul or 1)
        
        # 🆕 EXCLUSION BARID PRO
        if "BARID PRO" in produit:
            return 0.0, 0.0, 1.0, "Exclu (Produit='BARID PRO')"
        
        # Récupération de la base de calcul (commune)
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        nom_tache_safe = str(getattr(tache, 'nom_tache', '') or '').upper()
        
        # Normalisation pour vérification simplifiée des mots clés (enlève les accents pour le check)
        nom_norm = nom_tache_safe.replace("É", "E").replace("È", "E").replace("Ô", "O")
        
        print(f"🌍 [INTL] ANALYSE Tâche: Famille='{famille}' Nom='{nom_tache_safe}' (Norm: '{nom_norm}') Unite='{unite}'")
        
        # ✅ CONDITION: Famille GUICHET + Nom contient OPERATION, GUICHET, DEPOT + Unité COLIS
        # On utilise nom_norm pour être insensible aux accents (OPERATION vs OPÉRATION, DEPOT vs DÉPÔT)
        matches_conditions = (
            famille == "GUICHET" and 
            "OPERATION" in nom_norm and 
            "GUICHET" in nom_norm and 
            "DEPOT" in nom_norm and 
            unite == "COLIS"
        )
        
        if matches_conditions:
            
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
            
            # 🌍 APPLICATION DU PARAMÈTRE INTERNATIONAL
            pct_intl = float(context.raw_volumes.pct_international or 0.0)
            print(f"   🌍 [INTL] Applying International Parameter: {pct_intl}% on Volume={vol_source}")
            
            # Normalisation pourcentages > 1 (ex: 10 -> 0.10)
            if pct_intl > 1.0: 
                pct_intl = pct_intl / 100.0
            
            # Application inconditionnelle (Si 0 -> Volume 0)
            vol_source = vol_source * pct_intl
            ui_path += f" x {pct_intl:.2%} (International)"
            print(f"   🌍 [INTL] NEW VOLUME after International = {vol_source}")
            
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
                return 0.0, 0.0, 1.0, f"N/A (IntlGuiDep-Base={base_val}/Unit={unite})"
            
            # Calcul journalier
            volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
            facteur_base = float(base_val) / 100.0
            volume_final_jour = volume_jour * facteur_base
            
            print(f"   🌍 [INTL] RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
            return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
        
        else:
            # Si les conditions ne sont pas remplies, retourner N/A
            print(f"   ⚠️ [INTL] Conditions non remplies: Famille={famille}, Nom={nom_tache_safe}, Unite={unite}")
            return 0.0, 0.0, 1.0, f"N/A (INTL: Conditions non remplies)"
    
    # ---------------------------------------------------------
    # 2B. PRODUIT: AMANA DEPOT (ou DÉPÔT) - Traitement standard
    # ---------------------------------------------------------
    elif "AMANA" in produit and ("DEPOT" in produit or "DÉPÔT" in produit or "DEPÔT" in produit or "DÉPOT" in produit):
        
        # Récupération de la base de calcul (commune)
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()

        # DEBUG SÉCIFIQUE POUR COLLECTE
        if "COLLECTE" in famille or "CONFIRMATION" in tache.nom_tache.upper():
            print(f"🕵️ DEBUG AMANA DEPOT: ID={tache.id} Nom='{tache.nom_tache}' Famille='{famille}' Produit='{produit}' Base={tache.base_calcul}")

        phase = str(getattr(tache, 'phase', '') or '').strip().upper()
        
        # --- BRANCHE SPECIALE : Famille COLLECTE + Phase CIRCUL_COLLECT ---
        # Rule: %Coll * %Axes(D) * Cplx * Vol(D)
        if "COLLECTE" in famille and "CIRCUL_COLLECT" in phase:
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes /= 100.0
             
             pct_coll = context.raw_volumes.pct_collecte or 0.0
             if pct_coll > 1.0: pct_coll /= 100.0
             
             cplx_circ = context.raw_volumes.taux_complexite or 1.0
             
             vol_source = vol_aggregat * pct_axes * pct_coll * cplx_circ
             
             print(f"🔄 [DEBUG CIRCUL_COLLECT] Task='{tache.nom_tache}' VolAgreg={vol_aggregat} * {pct_axes:.2%}(Ax) * {pct_coll:.2%}(Coll) * {cplx_circ}(Cplx) -> VolSource={vol_source}")
             
             ui_path = f"AMANA.DEPART x {pct_axes:.2%}(AxD) x {pct_coll:.2%}(Coll) x {cplx_circ}(Cplx) [CirculCollect]"
             
             # Logic Base Standard
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             elif base_val == 60:
                 volume_annuel = vol_source
                 ui_path += " [Base 60%]"
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (CircColl-Base={base_val})"
             
             # Calcul journalier
             volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             facteur_base = float(base_val) / 100.0
             volume_final_jour = volume_jour * facteur_base 
             
             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

        # --- BRANCHE SPECIALE : Famille MARCHE ORDINAIRE + Phase CIRCUL_MARCH ---
        # Rule: %MarcheOrdinaire * %Axes(D) * Cplx * Vol(D)
        elif ("MARCHE ORDINAIRE" in famille or "MARCHE" in famille) and "CIRCUL_MARCH" in phase:
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes /= 100.0
             
             # pct_marche_ordinaire is stored where?
             # Usually context.raw_volumes.pct_marche_ordinaire
             pct_mo = context.raw_volumes.pct_marche_ordinaire or 0.0
             if pct_mo > 1.0: pct_mo /= 100.0
             
             cplx_circ = context.raw_volumes.taux_complexite or 1.0
             
             vol_source = vol_aggregat * pct_axes * pct_mo * cplx_circ
             
             print(f"🔄 [DEBUG CIRCUL_MARCH] Task='{tache.nom_tache}' VolAgreg={vol_aggregat} * {pct_axes:.2%}(Ax) * {pct_mo:.2%}(MO) * {cplx_circ}(Cplx) -> VolSource={vol_source}")
             
             ui_path = f"AMANA.DEPART x {pct_axes:.2%}(AxD) x {pct_mo:.2%}(MO) x {cplx_circ}(Cplx) [CirculMarch]"
             
             # Logic Base Standard
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             elif base_val == 60:
                 volume_annuel = vol_source
                 ui_path += " [Base 60%]"
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (CircMarch-Base={base_val})"
             
             # Calcul journalier
             volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             facteur_base = float(base_val) / 100.0
             volume_final_jour = volume_jour * facteur_base 
             
             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

        # --- BRANCHE SPECIALE : Famille COLLECTE (Règle générique) ---
        elif "COLLECTE" in famille:
             # Formule : Vol(Depart) * (1 - %Axes)
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes = pct_axes / 100.0
             facteur_hors_axes = 1.0 - pct_axes
             vol_source = vol_aggregat * facteur_hors_axes
             
             ui_path = f"AMANA.DEPART.AGREGAT x {facteur_hors_axes:.2%}(1-Axes) [Collecte]"
             
             # Cas Base 100
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             # Cas Base 60
             elif base_val == 60:
                 unite_upper = str(getattr(tache, 'unite_mesure', '') or '').upper()
                 if "SAC" in unite_upper:
                     ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                     if ratio > 0: 
                        volume_annuel = vol_source / ratio
                        ui_path += f" [Base 60% / Sac (Ratio={ratio})]"
                     else: volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
             # Cas Base 40
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (Coll-Forcee-Base={base_val})"
             
             # Calcul journalier
             volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             facteur_base = float(base_val) / 100.0
             volume_final_jour = volume_jour * facteur_base 
             
             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

        # --- BRANCHE SPECIALE : Famille ARRIVÉE CAMIONS AXES ---
        elif ("CAMION" in famille and "AXE" in famille) or "ARRIVEE CAMIONS AXES" in famille:
             # Formule demandée : Vol DEPART (Part+Pro) * (1 - Axes)
             
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes = pct_axes / 100.0
             
             facteur_cible = 1.0 - pct_axes
             vol_source = vol_aggregat * facteur_cible
             
             # --- GESTION UNITE SAC (GLOBAL) ---
             unite_upper = str(getattr(tache, 'unite_mesure', '') or '').upper()
             if "SAC" in unite_upper:
                 ratio_sac = context.raw_volumes.colis_amana_par_sac or 5.0
                 if ratio_sac > 0:
                     vol_source = vol_source / ratio_sac
                     ui_path += f" / Sac (Ratio={ratio_sac})"
                     print(f"   -> Division par Ratio Sac={ratio_sac}")
                 else:
                     vol_source = 0.0 # Eviter div/0

             # Debug Intermédiaire
             print(f"🎯 [DEBUG REGLE AXES (Block 2B)] '{tache.nom_tache}' VolAgreg(Dep)={vol_aggregat} %Axes={pct_axes:.2%} -> Facteur(1-Axes)={facteur_cible:.2%} -> Vol_Avant_Base={vol_source}")
             
             if base_val == 100:
                 print(f"⚠️ ATTENTION: Base Calcul = 100%. Si vous attendiez une réduction (ex: 60%), vérifiez la configuration de la tâche (ID={tache.id}) dans Excel/DB.")
             
             print(f"   -> Application Base Calcul: {vol_source:.2f} * {base_val}% = {vol_source * base_val / 100.0:.2f} (Volume Annuel Final)")
             
             ui_path = f"AMANA.DEPART.AGREGAT x {facteur_cible:.2%}(1-AxDep) [ArrCamAx-Fam]"
             
             # Cas Base 100
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             # Cas Base 60
             elif base_val == 60:
                 volume_annuel = vol_source
                 ui_path += " [Base 60%]"
             # Cas Base 40
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (ArrCamAx-Base={base_val})"
             
             # Calcul journalier
             volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             facteur_base = float(base_val) / 100.0
             volume_final_jour = volume_jour * facteur_base 
             
             # Debug Math Final
             moy_min = float(tache.moyenne_min or 0.0)
             est_hours = (volume_final_jour * moy_min * 60) / 3600 # Approx
             print(f"🏁 [DEBUG MATH] Task='{tache.nom_tache}' Unit='{unite_upper}'")
             print(f"   -> VolAnnuel(100%)={volume_annuel:.2f} | NbJours={nb_jours} | Base={base_val}%")
             print(f"   -> VolJourFinal={volume_final_jour:.2f} (Includes Base & Axes) | MoyMin={moy_min} ({moy_min*60:.1f} sec)")
             print(f"   -> Calcul Heures: ({volume_final_jour:.2f} colis/j * {moy_min} min) / 60 = {est_hours:.4f}h")

             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path
             
             # Calcul journalier
             volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             facteur_base = float(base_val) / 100.0
             volume_final_jour = volume_jour * facteur_base 
             
             print(f"🏁 [DEBUG FINAL] Task='{tache.nom_tache}' Base={base_val}% -> Traitement: {volume_annuel:.2f} * {facteur_base} = {volume_annuel*facteur_base:.2f}")

             return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

        # Note: Les tâches "AMANA DÉPÔT INTERNATIONAL" sont traitées par le bloc 2A (ci-dessus)
        # et ne rentreront jamais ici grâce au elif
        
        
        # --- BRANCHE 0 : Reporting (Prioritaire) ---
        nom_tache_safe = str(getattr(tache, 'nom_tache', '') or '').upper()
        if "REPORTING" in famille or "RECOUVREMENT" in nom_tache_safe:
            # Source : AGREGAT DEPART (PART + PRO) - 100%
            vol_source = context.get_aggregated_volume("AMANA", "DEPART")
            ui_path = "AMANA.DEPART.AGREGAT (Reporting)"
            
            # --- CAS 1 : BASE 100 ---
            if base_val == 100:
                volume_annuel = vol_source
                ui_path += " [Base 100%]"
            elif base_val == 40:
                volume_annuel = vol_source
                ui_path += " [Base 40%]"
            else:
                 return 0.0, 0.0, 1.0, f"N/A (Rep-Base={base_val})"

        # --- BRANCHE 1 : Arrivée Camions Axes ---
        elif "ARRIVÉE CAMIONS AXES" in famille or "ARRIVEE CAMIONS AXES" in famille:
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
        elif "CAMION PRINCIPAL" in famille and ("DEPART" in famille or "DÉPART" in famille):
            # Source : AGREGAT DEPART (PART + PRO)
            vol_source = context.get_aggregated_volume("AMANA", "DEPART")
            print(f"🎯 MATCH DCP !!! VolSource={vol_source}")
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
             print(f"📊 [PARAM APPLIED] Collecte Colis (Depot) - Tache: '{tache.nom_tache}' | Circ: {taux_complexite} | Application: vol_ref * (1-Ax) * %Coll * {taux_complexite}")
             ui_path += f"AMANA.DEPART.AGREGAT x {facteur_hors_axes:.2%}(1-Axes) x {pct_collecte:.2%}(Coll) x {taux_complexite}(Cplx)"
             
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
        elif "GUICHET" in famille or ( "OPERATION" in tache.nom_tache.upper()):
             # 🆕 Règle Spécifique : AMANA DEPOT LOCAL (Force Fallback logic with National Pct)
             is_special_local = ("AMANA" in produit and "DEPOT" in produit and "LOCAL" in produit) and base_val == 100 and "NATIONAL" in phase
             if is_special_local:
                 print(f"DEBUG_SIM: Special Local rule triggered for {tache.nom_tache} (Phase={phase})")
             
             # Priorité: Volume 'AMANA' / 'GUICHET' / 'DEPOT' (Sauf règle spéciale)
             vol_guichet_depot = 0.0 if is_special_local else context.get_volume("AMANA", "GUICHET", "DEPOT")
             
             if vol_guichet_depot > 0:
                 vol_source = vol_guichet_depot
                 ui_path = f"AMANA.GUICHET.DEPOT ({vol_guichet_depot:.0f})"
                 

             else:
                 # Fallback ou Spécial: AMANA DÉPART (Part+Pro) * (1 - %Axes)
                 vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
                 
                 pct_axes = context.raw_volumes.pct_axes_depart or 0.0
                 if pct_axes > 1.0: pct_axes = pct_axes / 100.0
                 facteur_hors_axes = 1.0 - pct_axes
                 
                 vol_source = vol_aggregat * facteur_hors_axes
                 ui_path = f"AMANA.DEPART.AGREGAT(Fallback) x {facteur_hors_axes:.2%}(1-AxesD)"
                 
                 if is_special_local:
                     ui_path = f"AMANA.DEPART.AGREGAT(Spec-Local) x {facteur_hors_axes:.2%}(1-AxesD)"

                 # 🆕 Règle Spécifique : Application du % International ou % National
                 # Le produit 'AMANA DEPOT' standard ne prend pas le coefficient international ici.
                 if ("INT" in produit and "DEPOT" in produit) or "NATIONAL" in phase: 
                     if "NATIONAL" in phase:
                         pct = context.raw_volumes.pct_national or 0.0
                         label = "National"
                     else:
                         pct = context.raw_volumes.pct_international or 0.0
                         label = "International"

                     if pct > 1.0: pct = pct / 100.0
                     vol_source = vol_source * pct
                     ui_path += f" x {pct:.2%} ({label})"
                     print(f"🌍 [{label.upper()}] Applied Coeff ({pct:.2%}) for product '{produit}' Vol={vol_source}")
             
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
            print(f"☠️ FALLBACK ELSE FAMILLE REACHED: Famille='{famille}'")
            return 0.0, 0.0, 1.0, f"N/A (Famille={famille})"
        
        # Calcul journalier commun pour AMANA DÉPÔT
        print(f"🏁 PRE-RETURN AMANA DEPOT: VolAnn={volume_annuel if 'volume_annuel' in locals() else 'UNDEF'} Path={ui_path}")
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        # Application du facteur base_calcul (100%, 60%, ou 40%)
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        print(f"   → AMANA DEPOT RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
            
    # --- FIN BLOC AMANA DEPOT ---

    # ---------------------------------------------------------
    # 6B. CAS SPÉCIAL : ARRIVÉE CAMIONS AXES (Produit)
    # ---------------------------------------------------------
    elif ("CAMION" in produit and "AXE" in produit) or "ARRIVÉE CAMIONS AXES" in produit or "ARRIVEE CAMIONS AXES" in produit:
        print(f"🎯 MATCH REGLE CAMIONS AXES: {produit}")
        # Formule demandée : Vol (Part+Pro) * (1 - Axes)
        
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # Détection sens (Dépôt/Départ ou Arrivée)
        if "DEPOT" in famille or "DÉPÔT" in famille or "DEPART" in famille:
             sens = "DEPART"
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             ui_sens = "DEPART (via Famille)"
        else:
             sens = "ARRIVEE" # Par défaut si famille != Dépôt
             pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
             ui_sens = "ARRIVEE (Defaut)"

        if pct_axes > 1.0: pct_axes = pct_axes / 100.0
        facteur_hors_axes = 1.0 - pct_axes
        
        vol_aggregat = context.get_aggregated_volume("AMANA", sens)
        vol_source = vol_aggregat * facteur_hors_axes
        
        ui_path = f"AMANA.{ui_sens}.AGREGAT x {facteur_hors_axes:.2%}(1-Axes) [ArrCamAx]"
        
        # Base Calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
             
        # Application Base
        if base_val == 100:
             volume_annuel = vol_source
             ui_path += " [Base 100%]"
        elif base_val == 40:
             volume_annuel = vol_source
             ui_path += " [Base 40%]"
        elif base_val == 60:
             unite_upper = str(getattr(tache, 'unite_mesure', '') or '').upper()
             if "SAC" in unite_upper:
                 ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                 if ratio > 0: 
                    volume_annuel = vol_source / ratio
                    ui_path += f" [Base 60%/Sac Ratio={ratio}]"
                 else: volume_annuel = 0.0
             else:
                 volume_annuel = vol_source
                 ui_path += " [Base 60%]"
        else:
             return 0.0, 0.0, 1.0, f"N/A (ArrCamAx-Base={base_val})"
             
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        facteur_base = float(base_val) / 100.0
        volume_final_jour = volume_jour * facteur_base
        
        return volume_annuel * facteur_base, volume_final_jour, 1.0 * facteur_base, ui_path

    # ---------------------------------------------------------
    # 2. PRODUIT: COLIS / AMANA DEPOT (Spécial Collecte & Axes)
    # ---------------------------------------------------------
    elif produit == "COLIS":
        log_trace(f"📦 BLOC COLIS/DEPOT: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")

        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
        famille_raw = getattr(tache, 'famille_uo', '')
        famille = str(famille_raw or '').strip().upper()
        
        # --- DEBUG EXPLICITE ---
        print(f"📦 [DEBUG AMANA DEPOT] Task='{tache.nom_tache}' Fam='{famille}' Prod='{produit}'")

        # --- CAS 1: COLLECTE ---
        if "COLLECTE" in famille or "COLLECTE" in tache.nom_tache.upper():
             vol_ref = context.get_aggregated_volume("AMANA", "DEPART")
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes /= 100.0
             pct_collecte = context.raw_volumes.pct_collecte or 0.0
             if pct_collecte > 1.0: pct_collecte /= 100.0
             taux_complexite = context.raw_volumes.taux_complexite or 1.0
             
             vol_source = vol_ref * (1.0 - pct_axes) * pct_collecte * taux_complexite
             ui_path = f"AMANA.DEP({int(vol_ref)}) x {1-pct_axes:.2f}(1-Ax) x {pct_collecte:.2f}(%Col) x {taux_complexite}(Cplx)"
             
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             elif base_val == 60:
                  if unite in ["SAC", "SACS"]:
                      ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                      if ratio > 0:
                         volume_annuel = vol_source / ratio
                         facteur_conversion = 1.0 / ratio
                         ui_path += f" [Base 60%/Sac R={ratio}]"
                      else: volume_annuel = 0.0
                  elif unite in ["CAISSON", "CAISSONS"]:
                      ratio = 500.0
                      volume_annuel = vol_source / ratio 
                      facteur_conversion = 1.0 / ratio
                      ui_path += f" [Base 60%/Caisson R={ratio}]"
                  else:
                      volume_annuel = vol_source
                      ui_path += " [Base 60%]"
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (Coll-Base={base_val})"
        
        # --- CAS 2: ARRIVÉE CAMIONS AXES (NOUVELLE REGLE) ---
        # On accepte: Famille contient 'CAMION' + 'AXE' OU Produit contient 'AXE' (ex: "AMANA DEPOT AXE")
        elif ("CAMION" in famille and "AXE" in famille) or "AXE" in produit:
             # Formule: Volume AGREGAT DEPART x (1 - %Axes)
             # "volume amana départ pro * axes +volume amana départ part" (Prompt ambiguous, assumons Logic 1-Axes as requested previously or correct interpretation: Local Part)
             # Wait, if "pro * axes + part", it means Pro part goes to Axes?
             # Let's stick to: GLOBAL * (1 - %Axes)
             
             vol_aggregat = context.get_aggregated_volume("AMANA", "DEPART")
             pct_axes = context.raw_volumes.pct_axes_depart or 0.0
             if pct_axes > 1.0: pct_axes = pct_axes / 100.0
             
             facteur_cible = 1.0 - pct_axes # On prend la partie LOCALE
             vol_source = vol_aggregat * facteur_cible
             
             print(f"🎯 [DEBUG REGLE AXES] '{tache.nom_tache}' VolAgreg={vol_aggregat} %Axes={pct_axes:.2%} -> Facteur(1-Axes)={facteur_cible:.2%} -> VolFinal={vol_source}")
             
             ui_path = f"AMANA.DEP.AGR x {facteur_cible:.2%}(1-Ax)"
             
             if base_val == 100:
                 volume_annuel = vol_source
                 ui_path += " [Base 100%]"
             elif base_val == 60:
                 if unite in ["SAC", "SACS"]:
                      ratio = context.raw_volumes.colis_amana_par_sac or 1.0
                      if ratio > 0:
                         volume_annuel = vol_source / ratio
                         facteur_conversion = 1.0 / ratio
                         ui_path += f" [Base 60%/Sac R={ratio}]"
                      else: volume_annuel = 0.0
                 else:
                     volume_annuel = vol_source
                     ui_path += " [Base 60%]"
             elif base_val == 40:
                 volume_annuel = vol_source
                 ui_path += " [Base 40%]"
             else:
                 return 0.0, 0.0, 1.0, f"N/A (ArrCamAx-Base={base_val})"

        else:
            return 0.0, 0.0, 1.0, f"N/A (Produit Colis/Depot hors Collecte/Axes)"
            
        # Commun
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        facteur_base = float(base_val) / 100.0
        volume_final_jour = math.ceil(volume_jour * facteur_base)
        
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path

    # --- FIN BLOC COLIS / AMANA DEPOT ---

    # ---------------------------------------------------------
    # 3. PRODUIT: CO ARRIVE (Courrier Ordinaire Arrivée)
    # ---------------------------------------------------------
    elif produit in ["CO ARRIVE", "CO ARRIVÉ", "COURRIER ORDINAIRE ARRIVE", "COURRIER ORDINAIRE ARRIVÉ"]:
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
            
            # Sub-cas Spécifique
            is_distrib_task = "DISTRIBUTION" in tache.nom_tache.upper()
            is_affectation_task = "AFFECTATION AUX FACTEURS" in tache.nom_tache.upper()
            is_retour_info = "RETOUR INFO" in tache.nom_tache.upper()
            is_courrier_unit = unite in ["COURRIER", "COURRIERS", "LETTRE", "LETTRES", "PLI", "PLIS"]
            
            # Source commune : AGREGAT CO ARRIVEE (PART + PRO)
            vol_aggregat = context.get_aggregated_volume("CO", "ARRIVEE")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
            
            vol_source_base = vol_aggregat * facteur_local
            
            # --- CAS SPECIFIQUE : RETOUR INFO ---
            if is_retour_info:
                # Correction : Suppresion du % Retour. on divise juste le volume Base / 350
                ratio_facteur = 350.0
                vol_source = vol_source_base / ratio_facteur
                
                ui_path = f"CO.ARR(1-Ax) / {ratio_facteur}"
                
                # Facteur de conversion simple
                facteur_conversion = 1.0 / ratio_facteur
                
                if base_val == 100:
                    volume_annuel = vol_source
                    ui_path += " [Base 100% / Spec:RetourInfo]"
                elif base_val == 40:
                    volume_annuel = vol_source
                    ui_path += " [Base 40% / Spec:RetourInfo]"
                else:
                    volume_annuel = vol_source
                    ui_path += f" [Base {base_val}% / Spec:RetourInfo]"

            # --- CAS SPECIFIQUE : AFFECTATION AUX FACTEURS ---
            elif is_affectation_task and base_val == 100:
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
                ui_path = f"CO.ARR.AGR({vol_aggregat:.0f}) x {facteur_local:.2%}(1-Ax) x {taux_complexite} x {nature_geo}"
                ui_path += " [Base 100% / Courrier / Dist]"
            
            elif base_val == 100 and unite == "FACTEUR":
                # Specifique: Etats non distribué 
                if "ETAT" in tache.nom_tache.upper() and ("NON DISTRIB" in tache.nom_tache.upper() or "NON-DISTRIB" in tache.nom_tache.upper()):
                     pct_retour = context.raw_volumes.pct_retour or 0.0
                     if pct_retour > 1.0: pct_retour /= 100.0
                     
                     ratio_facteur = 350.0
                     volume_annuel = (vol_source_base / ratio_facteur) * pct_retour
                     facteur_conversion = (1.0 / ratio_facteur) * pct_retour
                     
                     ui_path = f"(CO.ARR.AGR * (1-Ax)) / {ratio_facteur} x {pct_retour:.2%}(Ret)"
                     ui_path += " [Spec: Etats Non Dist]"
                else:
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
                ui_path = f"CO.ARR.AGR({int(vol_aggregat)}) x {facteur_local:.2%}(1-Ax)"
                
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
                     # Seule la tâche 'Distribution' prend les complexités
                     if "DISTRIBUTION" in tache.nom_tache.upper():
                         taux_complexite = context.raw_volumes.taux_complexite or 1.0
                         nature_geo = context.raw_volumes.nature_geo or 1.0
                         volume_annuel = vol_source * taux_complexite * nature_geo
                         ui_path += f" x {taux_complexite}(Cplx) x {nature_geo}(Geo) [Base 40% / Dist]"
                     else:
                         # Les autres tâches Base 40 en DL (ex: Tri Facteurs) n'ont pas les complexités
                         volume_annuel = vol_source
                         ui_path += " [Base 40%]"

                else:
                     return 0.0, 0.0, 1.0, f"N/A (CO-DL-Base={base_val}/Unit={unite})"
        
        # Calcul journalier commun (CO Arrivé)
        volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
        
        
        facteur_base = float(base_val) / 100.0
        # CORRECTION : On retire le math.ceil global qui force à 1 les petits volumes
        volume_final_jour = volume_jour * facteur_base
        
        if "CHARGEMENT" in tache.nom_tache.upper():
             print(f"DEBUG_CHARGEMENT: VolSource={vol_source} PctAxes={pct_axes if 'pct_axes' in locals() else 'N/A'} Base={base_val} VolAnn={volume_annuel} NbJ={nb_jours} VolJourFn={volume_final_jour} (Exact)")
             # ui_path += " [Arrondi Sup]"

        print(f"   → CO ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path


    # ---------------------------------------------------------
    # 4. PRODUIT: CO DEPART (ou CO MED)
    # ---------------------------------------------------------
    elif produit in ["CO DEPART", "CO DÉPART", "CO MED", "COURRIER ORDINAIRE DEPART", "COURRIER ORDINAIRE MED"]:
        log_trace(f"📮 BLOC CO DEPART: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
                     # Cas Unité Facteur : CO Global Départ / 350
                     # Correction demandée : Usage exclusif du volume CO Départ
                     
                     ratio_facteur = 350.0
                     volume_annuel = vol_source / ratio_facteur
                     facteur_conversion = 1.0 / ratio_facteur
                     
                     ui_path = f"CO.DEPART.GLOBAL({int(vol_source)}) / {ratio_facteur}"
                     ui_path += " [Regle: CO_Dep/350]"
                
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
        
        print(f"   → CO DEPART RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CO DEPART (VERROUILLE) ---

    # ---------------------------------------------------------
    # 5. PRODUIT: CR ARRIVE
    # ---------------------------------------------------------
    elif produit in ["CR ARRIVE", "CR ARRIVÉ", "COURRIER RECOMMANDE ARRIVE", "COURRIER RECOMMANDÉ ARRIVÉ"]:
        log_trace(f"📨 BLOC CR ARRIVE: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
                if unite in ["CAISSON", "CAISSONS"]:
                     ratio = getattr(context.raw_volumes, 'cr_par_caisson', 0) or 500.0
                     if ratio > 0:
                        volume_annuel = vol_source / ratio
                        facteur_conversion = 1.0 / ratio
                        ui_path += f" [Base 100% / Caisson (Ratio={ratio})]"
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
            ui_path = f"CR.ARR.GLO x {facteur_local:.2%}(1-Ax)"
            
            # --- CAS 1 : BASE 100 (Standard) ---
            if base_val == 100:
                print(f"🔍 DEBUG DISTRIB LOCALE: Nom='{tache.nom_tache}' Repr={ascii(tache.nom_tache)}")
                is_retour_info = "RETOUR INFO FACTEUR" in tache.nom_tache.upper()
                is_distrib_task = "DISTRIBUTION" in tache.nom_tache.upper()
                is_unite_courrier = unite in ["COURRIER", "COURRIERS", "LETTRE", "LETTRES", "PLI", "PLIS"]
                is_etats_non_distrib = "ETATS NON DISTRIBUE" in tache.nom_tache.upper().replace("É", "E").replace("È", "E")
                
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
                
                elif is_etats_non_distrib:
                     # Applique le % Retour
                     pct_ret = context.raw_volumes.pct_retour or 0.0
                     print(f"🎯 DEBUG ETATS NON DISTRIBUE: PctRetour={pct_ret} (Raw)")
                     if pct_ret > 1.0: pct_ret /= 100.0
                     volume_annuel = vol_source * pct_ret
                     ui_path += f" x {pct_ret:.2%}(Retour) [Spec: EtatsNonDist]"

                else:
                    print(f"⚠️ DEBUG NO MATCH DISTRIB LOCALE: '{tache.nom_tache}' (is_etats={is_etats_non_distrib})")
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
            vol_aggregat = context.get_volume("CR", "ARRIVEE", "GLOBAL")
            
            pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
            if pct_axes > 1.0: pct_axes = pct_axes / 100.0
            facteur_local = 1.0 - pct_axes
            
            vol_source_base = vol_aggregat * facteur_local
            ui_path = f"CR.ARRIVEE.GLOBAL x {facteur_local:.2%}(Local)"
            
            # Détection des tâches de Retrait/Récupération
            is_retrait = any(kw in tache.nom_tache.upper() for kw in ["RETRAIT", "RÉCUPÉRATION", "RECUPERATION", "RECUP"])
            
            # Application de la division par 5 pour les tâches de Retrait
            if is_retrait:
                vol_source = vol_source_base * 0.05
                ui_path += " X 5% (Retrait)"
            else:
                vol_source = vol_source_base
            
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
        
        print(f"   → CR ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CR ARRIVE (VERROUILLE) ---

    # ---------------------------------------------------------
    # 6. PRODUIT: CR DEPART (ou CR MED)
    # ---------------------------------------------------------
    elif produit in ["CR DEPART", "CR DÉPART", "CR MED", "COURRIER RECOMMANDE DEPART", "COURRIER RECOMMANDÉ MED"]:
        log_trace(f"📫 BLOC CR DEPART: ID={tache.id} '{tache.nom_tache}' PROD='{produit}'")
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # DEBUG: Vérifier si les tâches CR MED entrent ici
        if "ecriture" in tache.nom_tache.lower() and "CR" in produit:
            print(f"🔍 DEBUG_CR_DEPART: ID={tache.id} NOM='{tache.nom_tache}' PROD='{produit}' UNIT='{unite}' BASE={base_val}")
        
        # --- BRANCHE 1 : Arrivée Camions Axes ---
        if ("CAMION" in famille and "AXE" in famille) or "ARRIVEE CAMIONS AXES" in famille:
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
                     # REGLE GENERALE POUR BASE 40 / DEPART CAMION PRINCIPAL / CR MED :
                     # On applique TOUJOURS 100% du Volume Global (Pas de %Axes)
                     # Sauf exception explicite (s'il y en avait, mais ici on veut généraliser)
                     
                     volume_annuel = vol_source
                     ui_path += " [Base 40% (Std)]"

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
        
        print(f"   → CR DEPART RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # --- FIN BLOC CR MED/DEPART (VERROUILLE) ---

    # ---------------------------------------------------------
    # 7. PRODUIT: E-BARKIA ARRIVE
    # ---------------------------------------------------------
    elif produit in ["E-BARKIA ARRIVE", "E-BARKIA ARRIVÉ", "EBARKIA ARRIVE", "EBARKIA ARRIVÉ", "E BARKIA ARRIVE", "E BARKIA ARRIVÉ"]:
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
        famille = str(getattr(tache, 'famille_uo', '') or '').strip().upper()
        
        # --- BRANCHE 1 : Distribution Locale ---
        if "DISTRIBUTION LOCALE" in famille:
            # CAS SPECIFIQUE : Retour info e-barkia (J+1)
            # Formule: (Volume Depart Global * (1 - %Axes Depart) / 24)
            if "RETOUR INFO E" in tache.nom_tache.upper():
                # Formule: (Volume ARRIVEE Global / 24)
                vol_source = context.get_aggregated_volume("EB", "ARRIVEE")
                
                # Division par 24
                volume_annuel = vol_source / 24.0
                facteur_conversion = 1.0 / 24.0
                
                ui_path = f"EBARKIA.ARRIVEE.GLOBAL({vol_source:.0f}) / 24"
                ui_path += f" [Spec: RetourInfoJ+1]"
                
            else:
                # CORRECTION (Step 846): Utiliser E-BARKIA ARRIVEE GLOBAL
                vol_source = context.get_aggregated_volume("EB", "ARRIVEE")
                ui_path = "EBARKIA.ARRIVEE.GLOBAL"
                
                # Application systématique Nature Géo x Complexité pour ce bloc (Distribution Locale hors Retour Info)
                c_geo = context.raw_volumes.nature_geo or 1.0
                c_circ = context.raw_volumes.taux_complexite or 1.0
                vol_source = vol_source * c_geo * c_circ
                
                print(f"📊 [E-BARKIA ARRIVE] Appliqué: Geo={c_geo}, Circ={c_circ}")
                ui_path += f" * Geo({c_geo}) * Circ({c_circ})"

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
        
        print(f"   → E-BARKIA ARRIVE RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
        return volume_annuel * facteur_base, volume_final_jour, facteur_conversion * facteur_base, ui_path
    
    # ---------------------------------------------------------
    # 8. PRODUIT: E-BARKIA DEPART
    # ---------------------------------------------------------
    elif produit in ["E-BARKIA DEPART", "E-BARKIA DÉPART", "EBARKIA DEPART", "EBARKIA DÉPART", "E BARKIA DEPART", "E BARKIA DÉPART"]:
        
        # Récupération de la base de calcul
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
        
        print(f"   → E-BARKIA DEPART RETURN: vol_annuel={volume_annuel:.2f}, vol_jour={volume_final_jour:.2f}, path={ui_path}")
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
        base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
            
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
    
    # ---------------------------------------------------------
    # 10. FALLBACK: CHARGEMENT FACTEUR (Distribution Locale, CO Arrivée)
    # ---------------------------------------------------------
    if "CHARGEMENT FACTEUR" in tache.nom_tache.upper():
         # On a raté le bloc CO ARRIVE à cause du code Produit incorrect en base.
         # On applique la logique Distribution Locale Standard.
         
         vol_aggregat = context.get_aggregated_volume("CO", "ARRIVEE")
         pct_axes = context.raw_volumes.pct_axes_arrivee or 0.0
         if pct_axes > 1.0: pct_axes = pct_axes / 100.0
         facteur_local = 1.0 - pct_axes
         
         vol_source = vol_aggregat * facteur_local
         ui_path = f"CO.ARR.AGR({vol_aggregat:.0f}) x {facteur_local:.2%}(1-Ax) [Fallback Chargement]"
         
         # Récupération de la base (ex: 40%)
         base_val = parse_base_calcul(getattr(tache, 'base_calcul', 100))
         
         facteur_base = float(base_val) / 100.0
         volume_annuel = vol_source
         
         if base_val != 100:
             ui_path += f" [Base {base_val}%]"

         # Calcul journalier
         volume_jour = volume_annuel / nb_jours if nb_jours > 0 else 0.0
             
         return volume_annuel * facteur_base, volume_jour * facteur_base, 1.0, ui_path

    return 0.0, 0.0, 1.0, "N/A"

def calculer_volume_applique(tache: Any, context: VolumeContext) -> tuple:
    """
    Wrapper pour appliquer des paramètres globaux post-calcul (ex: Marché Ordinaire)
    """
    # Appel de la fonction de calcul brute (renommée _calculer_volume_raw)
    try:
        vol_annuel, vol_jour, conv, path = _calculer_volume_raw(tache, context)
    except NameError:
         # Fallback si le renommage n'a pas encore eu lieu (sécurité)
         # Mais ici on assume que l'étape suivante va renommer.
         # En fait, si je fais ça en deux étapes, ça va casser entre les deux.
         # Je dois tout faire en une fois ou m'assurer de l'ordre.
         # Je vais renommer L116 AVANT d'ajouter ce wrapper qui appelle le nouveau nom.
         # Donc ce code suppose que _calculer_volume_raw existe.
         return 0.0, 0.0, 1.0, "Err: _raw not found"

    # --- LOGIQUE NOUVELLE : Paramètre Marché Ordinaire (Non-AMANA) ---
    produit = str(getattr(tache, 'produit', '') or '').strip().upper()
    produit_raw = str(getattr(tache, 'produit', '') or '').upper()
    
    # Identification Non-AMANA (Marché Ordinaire)
    # Critère : Produit ne contient PAS "AMANA"
    # Attention : "AMANA DEPOT" -> Amana. "COLIS" -> Souvent Amana ?
    # Le code traite "COLIS" avec Amana Depot dans le bloc L1011.
    is_amana = "AMANA" in produit
    is_colis_pure = produit == "COLIS" # Colis traités comme Amana généralement
    
    if not is_amana and not is_colis_pure and vol_annuel > 0:
        pct_mo = float(context.raw_volumes.pct_marche_ordinaire or 0.0)
        
        # Si > 0, on applique. (Si 0, on considère "Pas de changement" pour rétrocompatibilité défaut)
        if pct_mo > 0.0:
             # Normalisation %
            facteur_mo = pct_mo
            if pct_mo > 1.0: facteur_mo = pct_mo / 100.0
            
            vol_annuel = vol_annuel * facteur_mo
            vol_jour = vol_jour * facteur_mo
            path += f" x {facteur_mo:.2%} (MO)"
            # print(f"📊 [MARCHE ORDINAIRE] Applied Coeff ({facteur_mo:.2%}) on '{tache.nom_tache}' (Prod='{produit}')")

    return vol_annuel, vol_jour, conv, path

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
            
        if t.etat != 'NA' or ("Rapprochement" in (t.nom_tache or "")) or ("Comptage" in (t.nom_tache or "")) or ("Chargement" in (t.nom_tache or "")) or ("DISTRIBUTION LOCALE" in (t.famille_uo or "").upper()):
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
        
        # Ignorer si volume nul (Sauf Debug Chargement)
        if vol_jour <= 0:
            if "CHARGEMENT" in tache.nom_tache.upper():
                 print(f"⚠️ FORCE SHOW CHARGEMENT EVEN IF VOL=0: {tache.nom_tache}")
            else:
                print(f"⚠️ SKIPPING TASK (vol=0): ID={tache.id} '{tache.nom_tache}' PROD='{getattr(tache, 'produit', 'N/A')}'")
                continue
            
        # Calcul temps avec Précision Excel
        # 🆕 PRIORITY: Use valid moy_sec from DB if available (Exact seconds)
        if getattr(tache, 'moy_sec', None) is not None and float(tache.moy_sec or 0) > 0:
             moyenne_sec = float(tache.moy_sec)
        else:
             # Fallback: Conversion en SECONDES exactes pour les cas connus d'arrondis depuis moyenne_min
             moyenne_min_raw = float(tache.moyenne_min or 0.0)
             
             if abs(moyenne_min_raw - 0.83) < 0.005:
                  moyenne_sec = 50.0 
             elif abs(moyenne_min_raw - 0.17) < 0.005:
                  moyenne_sec = 10.0 
             elif abs(moyenne_min_raw - 0.33) < 0.005:
                  moyenne_sec = 20.0 
             elif abs(moyenne_min_raw - 0.67) < 0.005:
                  moyenne_sec = 40.0 
             elif abs(moyenne_min_raw - 1.67) < 0.005:
                  moyenne_sec = 100.0
             else:
                  moyenne_sec = moyenne_min_raw * 60.0 # Valeur brute convertie
             
        # 2. Calcul Heures sans arrondir le volume journalier
        # Heures = (Volume * Sec/Unité) / 3600
        # Note: on utilise vol_jour brut (non arrondi) pour garder la précision Excel
        
        # 🆕 EXCEPTION: Comptage Colis -> on tronque le volume journalier (ex: 416.35 -> 416)
        # 🆕 EXCEPTION: Comptage Colis / Chargement Facteur / Appel Client -> on tronque le volume journalier
        if ("COMPTAGE" in tache.nom_tache.upper() and "COLIS" in tache.nom_tache.upper()) or ("CHARGEMENT FACTEUR" in tache.nom_tache.upper()) or ("APPEL CLIENT" in tache.nom_tache.upper()):
             vol_jour_used = int(vol_jour)
             print(f"🔧 RULE APPLIED (Int Truncate): {tache.nom_tache} vol_jour {vol_jour} -> {vol_jour_used}")
        else:
             vol_jour_used = vol_jour

        heures_tache = (vol_jour_used * moyenne_sec) / 3600.0

        # Règle Spécifique : Distribution (AMANA RECU) - Ajout Complexité Géo & Circulation
        # Formule Excel : = Vol * Temps * ... * $O$11(Geo) * $O$12(Circ)
        is_distrib_amana = "DISTRIBUTION" == (tache.nom_tache or "").upper().replace("É", "E").replace("È", "E").strip() and "AMANA RECU" in (getattr(tache, 'produit', '') or "").upper()
        
        if is_distrib_amana:
             comp_geo = float(ctx.raw_volumes.nature_geo or 1.0)
             comp_circ = float(ctx.raw_volumes.taux_complexite or 1.0)
             heures_tache_base = heures_tache
             heures_tache = heures_tache * comp_geo * comp_circ
             if abs(heures_tache - heures_tache_base) > 0.0001:
                  print(f"🔧 RULE APPLIED (Complexity): ID={tache.id} x{comp_geo}(Geo) x{comp_circ}(Circ). Hours: {heures_tache_base:.4f} -> {heures_tache:.4f}")
        
        # Pour compatibilité avec le reste du code (TacheDetail)
        moyenne_min = moyenne_sec / 60.0

        
        # Application Productivité
        if productivite and productivite > 0:
             heures_tache = heures_tache * (100.0 / productivite)
        
        total_heures += heures_tache
        
        # Création Detail
        nom_tache = tache.nom_tache or "Sans nom"
        


        unite = tache.unite_mesure or ""
        
        # Récupération des métadonnées pour le frontend
        base_calcul_val = getattr(tache, 'base_calcul', None)
        base_calcul_int = parse_base_calcul(base_calcul_val) if base_calcul_val is not None else None
            
        produit_str = str(getattr(tache, 'produit', '') or '').strip()
        
        detail = TacheDetail(
            id=tache.id,  # 🆕 Matching par ID
            task=nom_tache,
            phase=tache.phase or "N/A",
            unit=unite,
            base_calcul=base_calcul_int,  # 🆕 Base pour affichage frontend
            produit=produit_str if produit_str else None,  # 🆕 Produit pour différenciation
            avg_sec=moyenne_min * 60.0,
            heures=round(heures_tache, 6), # Précision augmentée à 6 décimales
            nombre_unite=round(vol_jour, 4), # Précision augmentée à 4 décimales
            formule=f"Vol={vol_jour:.4f} ({produit_str or 'N/A'}: {path}) × {moyenne_min:.4f}min [Unit={unite}, Base={base_calcul_int}%]",
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

