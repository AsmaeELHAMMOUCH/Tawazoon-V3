from pathlib import Path
path = Path('backend/app/services/simulation.py')
data = path.read_text(encoding='utf-8', errors='ignore')
old = """        if unite_normalisee in (\"colis\", \"colis_amana\", \"amana\"):\n            is_amana_task = (\"amana\" in nom_lower) or (type_flux == \"amana\")\n            if is_amana_task:\n                # eo. AMANA en colis/jour (sans division)\n                volume_jour = amana_colis_jour\n            else:\n                # colis \"classiques\" ?ventuels\n                volume_jour = float(getattr(volumes_obj, \"colis\", 0) or 0)\n\n        # --------------------\n        # 2) SACS\n"""
new = """        if unite_normalisee in (\"colis\", \"colis_amana\", \"amana\"):\n            is_amana_task = (\"amana\" in nom_lower) or (type_flux == \"amana\")\n            if is_amana_task:\n                # AMANA en colis/jour (sans division)\n                volume_jour = amana_colis_jour\n            else:\n                # colis \"classiques\" éventuels, sinon fallback AMANA si présent\n                volume_jour = float(getattr(volumes_obj, \"colis\", 0) or 0)\n                if volume_jour <= 0 and amana_colis_jour > 0:\n                    volume_jour = amana_colis_jour\n                    is_amana_task = True\n\n        # --------------------\n        # 2) SACS\n"""
if old not in data:
    raise SystemExit('pattern not found')
path.write_text(data.replace(old, new), encoding='utf-8')
print('updated')
