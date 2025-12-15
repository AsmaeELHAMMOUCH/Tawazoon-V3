# -*- coding: utf-8 -*-
from pathlib import Path
import re
path = Path('backend/app/api/simulate.py')
data = path.read_text(encoding='utf-8', errors='ignore')
pattern = re.compile(r"""        for poste_id, meta in postes_meta.items\(\):\n.*?intitule_rh": meta\["poste_label"\],\n                \}\n            \)\n""", re.S)
replacement = """        for centre_poste_id, meta in postes_meta.items():
            # ? FIX MINIMAL: gérer clés int vs str dans heures_par_poste
            heures_poste = round(
                float(
                    heures_par_poste.get(centre_poste_id)
                    or heures_par_poste.get(str(centre_poste_id))
                    or 0.0
                ),
                2,
            )

            total_heures_round += heures_poste

            etp_calcule = heures_poste / heures_net if heures_net > 0 else 0.0
            etp_arrondi = round_half_up(etp_calcule)
            ecart = etp_arrondi - meta["effectif_actuel"]

            postes_payload.append(
                {
                    "poste_id": meta["poste_id"],
                    "centre_poste_id": centre_poste_id,
                    "poste_label": meta["poste_label"],
                    "type_poste": meta["type_poste"],
                    "effectif_actuel": meta["effectif_actuel"],
                    "total_heures": heures_poste,
                    "etp_calcule": round(etp_calcule, 6),
                    "etp_arrondi": etp_arrondi,
                    "ecart": ecart,
                    "intitule_rh": meta["poste_label"],
                }
            )
"""
new_data, n = pattern.subn(replacement, data)
if n == 0:
    raise SystemExit('block not replaced')
path.write_text(new_data, encoding='utf-8')
print('replaced', n)
