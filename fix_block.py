# -*- coding: utf-8 -*-
from pathlib import Path
lines = Path('backend/app/api/simulate.py').read_text(encoding='utf-8').splitlines()
marker = '        # 5. Construction des postes avec ETP par poste'
try:
    idx = lines.index(marker)
except ValueError:
    raise SystemExit('marker not found')
new_block = [
    marker,
    '        postes_payload = []',
    '        total_heures_round = 0.0',
    '',
    '        for centre_poste_id, meta in postes_meta.items():',
    '            # FIX: align heures_par_poste keys (centre_poste_id)',
    '            heures_poste = round(',
    '                float(',
    '                    heures_par_poste.get(centre_poste_id)',
    '                    or heures_par_poste.get(str(centre_poste_id))',
    '                    or 0.0',
    '                ),',
    '                2,',
    '            )',
    '',
    '            total_heures_round += heures_poste',
    '',
    '            etp_calcule = heures_poste / heures_net if heures_net > 0 else 0.0',
    '            etp_arrondi = round_half_up(etp_calcule)',
    '            ecart = etp_arrondi - meta["effectif_actuel"]',
    '',
    '            postes_payload.append(',
    '                {',
    '                    "poste_id": meta["poste_id"],',
    '                    "centre_poste_id": centre_poste_id,',
    '                    "poste_label": meta["poste_label"],',
    '                    "type_poste": meta["type_poste"],',
    '                    "effectif_actuel": meta["effectif_actuel"],',
    '                    "total_heures": heures_poste,',
    '                    "etp_calcule": round(etp_calcule, 6),',
    '                    "etp_arrondi": etp_arrondi,',
    '                    "ecart": ecart,',
    '                    "intitule_rh": meta["poste_label"],',
    '                }',
    '            )',
]
end_idx = idx
while end_idx < len(lines) and not lines[end_idx].startswith('        total_heures ='):
    end_idx += 1
lines[idx:end_idx] = new_block
Path('backend/app/api/simulate.py').write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('done', idx, end_idx)
