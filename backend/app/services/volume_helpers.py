from typing import Any, Dict, List, Optional

def get_co_volume_generic(ctx_volumes: Any, sens: str = 'ARRIVEE', segment: str = 'GLOBAL') -> float:
    """
    Helper générique pour récupérer le volume CO depuis ctx_volumes.
    
    Args:
        ctx_volumes: Contexte de volumes
        sens: Sens du flux ('ARRIVEE' ou 'DEPART')
        segment: Segment à chercher ('GLOBAL', 'DISTRIBUTION', etc.)
    
    Returns:
        volume_annuel: Volume annuel trouvé (float)
    """
    volumes_flux = getattr(ctx_volumes, 'volumes_flux', [])
    
    for vol_entry in volumes_flux:
        # Gérer à la fois les objets et les dictionnaires
        if hasattr(vol_entry, 'flux'):
            flux = getattr(vol_entry, 'flux', '')
            sens_entry = getattr(vol_entry, 'sens', '')
            seg = getattr(vol_entry, 'segment', '')
            volume = getattr(vol_entry, 'volume', 0)
        else:
            flux = vol_entry.get('flux', '')
            sens_entry = vol_entry.get('sens', '')
            seg = vol_entry.get('segment', '')
            volume = vol_entry.get('volume', 0)
        
        if (flux == 'CO' and sens_entry == sens and seg == segment):
            return float(volume)
    
    return 0.0


# Fonctions de compatibilité (wrappers)
def get_co_volume_from_context(ctx_volumes: Any, segment: str = 'GLOBAL') -> float:
    """Wrapper pour compatibilité - récupère volume CO Arrivée"""
    return get_co_volume_generic(ctx_volumes, 'ARRIVEE', segment)


def get_co_depart_volume_from_context(ctx_volumes: Any, segment: str = 'GLOBAL') -> float:
    """Wrapper pour compatibilité - récupère volume CO Départ"""
    return get_co_volume_generic(ctx_volumes, 'DEPART', segment)


def get_cr_volume_generic(ctx_volumes: Any, sens: str = 'ARRIVEE', segment: str = 'GLOBAL') -> float:
    """
    Helper générique pour récupérer le volume CR depuis ctx_volumes.
    
    Args:
        ctx_volumes: Contexte de volumes
        sens: Sens du flux ('ARRIVEE' ou 'DEPART')
        segment: Segment à chercher ('GLOBAL', 'DISTRIBUTION', etc.)
    
    Returns:
        volume_annuel: Volume annuel trouvé (float)
    """
    volumes_flux = getattr(ctx_volumes, 'volumes_flux', [])
    
    for vol_entry in volumes_flux:
        # Gérer à la fois les objets et les dictionnaires
        if hasattr(vol_entry, 'flux'):
            flux = getattr(vol_entry, 'flux', '')
            sens_entry = getattr(vol_entry, 'sens', '')
            seg = getattr(vol_entry, 'segment', '')
            volume = getattr(vol_entry, 'volume', 0)
        else:
            flux = vol_entry.get('flux', '')
            sens_entry = vol_entry.get('sens', '')
            seg = vol_entry.get('segment', '')
            volume = vol_entry.get('volume', 0)
        
        if (flux == 'CR' and sens_entry == sens and seg == segment):
            return float(volume)
    
    return 0.0


# Fonctions de compatibilité CR (wrappers)
def get_cr_volume_from_context(ctx_volumes: Any, segment: str = 'GLOBAL') -> float:
    """Wrapper pour compatibilité - récupère volume CR Arrivée"""
    return get_cr_volume_generic(ctx_volumes, 'ARRIVEE', segment)


def get_cr_depart_volume_from_context(ctx_volumes: Any, segment: str = 'GLOBAL') -> float:
    """Wrapper pour compatibilité - récupère volume CR Départ"""
    return get_cr_volume_generic(ctx_volumes, 'DEPART', segment)
