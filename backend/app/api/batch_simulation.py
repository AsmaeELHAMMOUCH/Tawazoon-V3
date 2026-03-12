# backend/app/api/batch_simulation.py
"""
Simulation Batch — Régionale & Nationale
Endpoints:
  GET  /batch/template/regional?region_id={id}   → Excel template pour une région
  GET  /batch/template/national                   → Excel template pour tout le réseau
  POST /batch/simulate                            → Lance la simulation sur le fichier importé
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import io
import openpyxl
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side, Color
from openpyxl.utils import get_column_letter

from app.core.db import get_db
from app.services.bandoeng_engine import (
    run_bandoeng_simulation,
    BandoengInputVolumes,
    BandoengParameters,
)
from app.services.taches_service import auto_import_tasks_if_empty


router = APIRouter(prefix="/batch", tags=["Batch Simulation"])

# ─────────────────────────────────────────────────────────────────────────────
# Styles helpers
# ─────────────────────────────────────────────────────────────────────────────
def _styles():
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)
    bold = Font(bold=True)
    title_font = Font(bold=True, size=12, color="FFFFFF")
    header_fill_blue = PatternFill("solid", fgColor="005EA8")
    header_fill_gray = PatternFill("solid", fgColor="E2E8F0")
    depart_fill = PatternFill("solid", fgColor="EFF6FF")
    arrive_fill = PatternFill("solid", fgColor="F0FDF4")
    param_fill = PatternFill("solid", fgColor="FFF7ED")
    input_fill = PatternFill("solid", fgColor="FFFBEB")
    locked_fill = PatternFill("solid", fgColor="F1F5F9")
    thin = Border(
        left=Side(style="thin", color="CBD5E1"),
        right=Side(style="thin", color="CBD5E1"),
        top=Side(style="thin", color="CBD5E1"),
        bottom=Side(style="thin", color="CBD5E1"),
    )
    return dict(
        center=center, bold=bold, title_font=title_font,
        header_fill_blue=header_fill_blue, header_fill_gray=header_fill_gray,
        depart_fill=depart_fill, arrive_fill=arrive_fill,
        param_fill=param_fill, input_fill=input_fill,
        locked_fill=locked_fill, thin=thin
    )


# ─────────────────────────────────────────────────────────────────────────────
# Canvas structure — identique à BandoengGrid.jsx
# ─────────────────────────────────────────────────────────────────────────────
#
#  DÉPART block:
#    PRO:           Global | Local | Axes         (Amana, CR, CO only)
#    Particuliers:  Global | Local | Axes         (Amana only)
#    Single col:    Med                           (Ebarkia, LRH)
#
#  ARRIVÉ block (même structure):
#    PRO:           Global | Local | Axes
#    Particuliers:  Global | Local | Axes         (Amana only)
#    Single col:                                  (Ebarkia, LRH)
#
# Excel key format used for parsing:   flux_sens_segment_subsegment
# e.g.: amana_depot_gc_global, cr_med_global, ebarkia_med
#

FLUX_ROWS = ["Amana", "CR", "CO", "El Barkia", "LRH"]

# Columns per block (13 total including label)
# Block structure:  [Label] [D-PRO-Global] [D-PRO-Local] [D-PRO-Axes] [D-Part-Global] [D-Part-Local] [D-Part-Axes] [A-PRO-Global] [A-PRO-Local] [A-PRO-Axes] [A-Part-Global] [A-Part-Local] [A-Part-Axes]
#                      A         B              C             D              E              F              G              H              I              J              K              L              M

CANVAS_HEADERS = {
    "label_col": 1,  # A
    "depart_start": 2,  # B
    "depart_cols": [  # B-G
        ("PRO", "Global"),    # B
        ("PRO", "Local"),     # C
        ("PRO", "Axes"),      # D
        ("Part.", "Global"),  # E
        ("Part.", "Local"),   # F
        ("Part.", "Axes"),    # G
    ],
    "arrive_start": 8,  # H
    "arrive_cols": [  # H-M
        ("PRO", "Global"),    # H
        ("PRO", "Local"),     # I
        ("PRO", "Axes"),      # J
        ("Part.", "Global"),  # K
        ("Part.", "Local"),   # L
        ("Part.", "Axes"),    # M
    ],
}

# For each flux row, which cells are active (True) vs locked (False)
# [D-PRO-G, D-PRO-L, D-PRO-A, D-Part-G, D-Part-L, D-Part-A, A-PRO-G, A-PRO-L, A-PRO-A, A-Part-G, A-Part-L, A-Part-A]
FLUX_ACTIVE_CELLS = {
    "Amana":     [True,  True,  True,  True,  True,  True,  True,  True,  True,  True,  True,  True],
    "CR":        [True,  True,  True,  False, False, False, True,  True,  True,  False, False, False],
    "CO":        [True,  True,  True,  False, False, False, True,  True,  True,  False, False, False],
    "El Barkia": [True,  False, False, False, False, False, True,  False, False, False, False, False],
    "LRH":       [True,  False, False, False, False, False, True,  False, False, False, False, False],
}

# Excel cell keys for parsing (same order as FLUX_ACTIVE_CELLS)
FLUX_CELL_KEYS = {
    "Amana":     [
        "amana_depot_gc_global", "amana_depot_gc_local", "amana_depot_gc_axes",
        "amana_depot_part_global", "amana_depot_part_local", "amana_depot_part_axes",
        "amana_recu_gc_global",  "amana_recu_gc_local",  "amana_recu_gc_axes",
        "amana_recu_part_global","amana_recu_part_local","amana_recu_part_axes",
    ],
    "CR":        [
        "cr_med_global", "cr_med_local", "cr_med_axes",
        None, None, None,
        "cr_arrive_global", "cr_arrive_local", "cr_arrive_axes",
        None, None, None,
    ],
    "CO":        [
        "co_med_global", "co_med_local", "co_med_axes",
        None, None, None,
        "co_arrive_global", "co_arrive_local", "co_arrive_axes",
        None, None, None,
    ],
    "El Barkia": [
        "ebarkia_med", None, None, None, None, None,
        "ebarkia_arrive", None, None, None, None, None,
    ],
    "LRH":       [
        "lrh_med", None, None, None, None, None,
        "lrh_arrive", None, None, None, None, None,
    ],
}

GLOBAL_PARAMS = [
    ("shift",               "Nombre de Shifts",           1,     ""),
    ("productivite",        "Productivité",              100.0,   "%"),
    ("idle_minutes",        "Temps Mort",                  0.0,  "min"),
    ("coeff_circ",          "Coeff. Circulaire",           1.0,   ""),
    ("coeff_geo",           "Coeff. Géographique",         1.0,   ""),
    ("has_guichet",         "Guichet (1=Oui, 0=Non)",      1,     ""),
    ("duree_trajet",        "Durée Trajet",                0.0,  "min"),
]

AMANA_PARAMS = [
    ("ed_percent",              "% ED (Global)",           40.0,   "%"),
    ("amana_pct_collecte",      "% Collecte Amana",        0.0,   "%"),
    ("amana_pct_retour",        "% Retour Amana",          0.0,   "%"),
    ("amana_pct_axes_arrivee",  "Axes Amana",              0.0,   "%"),
    ("amana_pct_axes_depart",   "Local Amana",             0.0,   "%"),
    ("amana_pct_national",      "% National Amana",        0.0,   "%"),
    ("amana_pct_international", "% International Amana",   0.0,   "%"),
    ("amana_pct_marche_ordinaire", "% Marché Ordinaire Amana", 0.0, "%"),
    ("amana_pct_crbt",          "% CRBT Amana",            0.0,   "%"),
    ("amana_pct_hors_crbt",     "% Hors CRBT Amana",       0.0,   "%"),
    ("colis_amana_par_canva_sac", "Colis Amana/Sac",      35.0,   ""),
]

CO_PARAMS = [
    ("co_pct_collecte",         "% Collecte CO",           0.0,   "%"),
    ("co_pct_marche_ordinaire", "% Marché Ordinaire CO",   0.0,   "%"),
    ("co_pct_axes_arrivee",     "Axes CO",                 0.0,   "%"),
    ("co_pct_axes_depart",      "Local CO",                0.0,   "%"),
    ("co_pct_vague_master",     "% Vaguemestre CO",       0.0,   "%"),
    ("co_pct_boite_postale",    "% Boîte Postale CO",      0.0,   "%"),
    ("nbr_co_sac",              "Nbr CO/Sac",            350.0,   ""),
]

CR_PARAMS = [
    ("cr_pct_collecte",         "% Collecte CR",           0.0,   "%"),
    ("cr_pct_retour",           "% Retour CR",             0.0,   "%"),
    ("cr_pct_axes_arrivee",     "Axes CR",                 0.0,   "%"),
    ("cr_pct_axes_depart",      "Local CR",                0.0,   "%"),
    ("cr_pct_national",         "% National CR",           0.0,   "%"),
    ("cr_pct_international",    "% International CR",      0.0,   "%"),
    ("cr_pct_marche_ordinaire", "% Marché Ordinaire CR",   0.0,   "%"),
    ("cr_pct_vague_master",     "% Vaguemestre CR",       0.0,   "%"),
    ("cr_pct_boite_postale",    "% Boîte Postale CR",      0.0,   "%"),
    ("cr_pct_crbt",             "% CRBT CR",               0.0,   "%"),
    ("cr_pct_hors_crbt",        "% Hors CRBT CR",          0.0,   "%"),
    ("cr_par_caisson",          "CR par Caisson",        500.0,   ""),
]

# Liste technique pour itérer le parser si besoin de compatibilité
PARAMS_FLUX_MAP = {
    "GLOBALE": (GLOBAL_PARAMS, "F97316"), # Orange
    "AMANA":   (AMANA_PARAMS,  "0EA5E9"), # Blue
    "COURRIER ORDINAIRE": (CO_PARAMS, "64748B"), # Slate
    "COURRIER RECOMMANDÉ": (CR_PARAMS, "10B981"), # Emerald
}

# ─────────────────────────────────────────────────────────────────────────────
# Core: generate template workbook
# ─────────────────────────────────────────────────────────────────────────────
def _build_template_workbook(centres: list) -> openpyxl.Workbook:
    s = _styles()
    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    # ── Guide sheet ─────────────────────────────────────────────────────────
    ws_g = wb.create_sheet("Guide", 0)
    ws_g["A1"] = "GUIDE — SIMULATION RÉGIONALE / NATIONALE"
    ws_g["A1"].font = Font(bold=True, size=14, color="005EA8")
    ws_g["A3"] = "⚠️  NE PAS RENOMMER NI SUPPRIMER LES ONGLETS"
    ws_g["A3"].font = Font(bold=True, color="CC0000")
    ws_g["A4"] = "Le nom de chaque onglet identifie le centre. Toute modification provoquera une erreur d'import."
    ws_g["A6"] = "REMPLISSAGE"
    ws_g["A6"].font = Font(bold=True)
    ws_g["A7"] = "• Cellules jaunes = volumes à saisir (volumes annuels)"
    ws_g["A8"] = "• Cellules grises = non applicables pour ce flux (laisser vides)"
    ws_g["A9"] = "• Section PARAMÈTRES : modifier les valeurs de la colonne B uniquement"
    ws_g["A11"] = "STRUCTURE CANVAS (identique à l'interface Simulation Wizard)"
    ws_g["A11"].font = Font(bold=True)
    ws_g["A12"] = "Bloc DÉPART   → colonnes B à G  (PRO: Global/Local/Axes | Part.: Global/Local/Axes)"
    ws_g["A13"] = "Bloc ARRIVÉ   → colonnes H à M  (même structure)"
    ws_g.column_dimensions["A"].width = 90

    used_names = set()

    for c in centres:
        c_id = c["id"]
        c_label = c["label"]
        region_label = c.get("region_label", "")

        safe = "".join(x for x in c_label if x not in r'[]:*?/\\')[:28]
        name = safe
        idx = 1
        while name in used_names:
            name = f"{safe[:26]}{idx}"
            idx += 1
        used_names.add(name)

        ws = wb.create_sheet(name)

        # Row 1: centre info
        ws.merge_cells("A1:M1")
        ws["A1"] = f"CENTRE : {c_label}  |  RÉGION : {region_label}  |  ID : {c_id}"
        ws["A1"].font = s["title_font"]
        ws["A1"].fill = s["header_fill_blue"]
        ws["A1"].alignment = s["center"]

        # Row 2: block headers
        ws.merge_cells("B2:G2")
        ws["B2"] = "DÉPART"
        ws["B2"].font = Font(bold=True, color="FFFFFF")
        ws["B2"].fill = PatternFill("solid", fgColor="0EA5E9")
        ws["B2"].alignment = s["center"]

        ws.merge_cells("H2:M2")
        ws["H2"] = "ARRIVÉ"
        ws["H2"].font = Font(bold=True, color="FFFFFF")
        ws["H2"].fill = PatternFill("solid", fgColor="10B981")
        ws["H2"].alignment = s["center"]

        # Row 3: sub-block headers (PRO / Particuliers)
        for start_col, label in [(2, "PRO"), (5, "Particuliers"), (8, "PRO"), (11, "Particuliers")]:
            ws.merge_cells(
                start_row=3, start_column=start_col,
                end_row=3, end_column=start_col + 2
            )
            cell = ws.cell(row=3, column=start_col, value=label)
            cell.font = Font(bold=True)
            cell.fill = s["header_fill_gray"]
            cell.alignment = s["center"]
            cell.border = s["thin"]

        # Row 4: column headers
        ws.cell(row=4, column=1, value="Flux").font = Font(bold=True)
        ws.cell(row=4, column=1).fill = s["header_fill_gray"]
        ws.cell(row=4, column=1).alignment = s["center"]
        ws.cell(row=4, column=1).border = s["thin"]

        for i, (_, subcol) in enumerate(CANVAS_HEADERS["depart_cols"]):
            col = CANVAS_HEADERS["depart_start"] + i
            c_cell = ws.cell(row=4, column=col, value=subcol)
            c_cell.font = Font(bold=True)
            c_cell.fill = s["depart_fill"]
            c_cell.alignment = s["center"]
            c_cell.border = s["thin"]

        for i, (_, subcol) in enumerate(CANVAS_HEADERS["arrive_cols"]):
            col = CANVAS_HEADERS["arrive_start"] + i
            c_cell = ws.cell(row=4, column=col, value=subcol)
            c_cell.font = Font(bold=True)
            c_cell.fill = s["arrive_fill"]
            c_cell.alignment = s["center"]
            c_cell.border = s["thin"]

        # Rows 5-9: data rows per flux
        for r_idx, flux in enumerate(FLUX_ROWS):
            row = 5 + r_idx
            active = FLUX_ACTIVE_CELLS[flux]

            # Label cell
            lbl = ws.cell(row=row, column=1, value=flux)
            lbl.font = Font(bold=True)
            lbl.alignment = Alignment(vertical="center")
            lbl.border = s["thin"]
            lbl.fill = s["header_fill_gray"]

            # 12 data cells
            for col_offset, is_active in enumerate(active):
                col = 2 + col_offset
                cell = ws.cell(row=row, column=col, value=0 if is_active else None)
                cell.border = s["thin"]
                if is_active:
                    cell.fill = s["input_fill"]
                    cell.alignment = Alignment(horizontal="center")
                    cell.number_format = "#,##0"
                else:
                    cell.fill = s["locked_fill"]

        # Column widths
        ws.column_dimensions["A"].width = 12
        for col in range(2, 14):
            ws.column_dimensions[get_column_letter(col)].width = 11
        ws.row_dimensions[1].height = 22
        ws.row_dimensions[2].height = 18

        # ── PARAMS section ──────────────────────────────────────────────────
        curr_row = 12
        for section_name, (params, color) in PARAMS_FLUX_MAP.items():
            ws.merge_cells(f"A{curr_row}:D{curr_row}")
            ws[f"A{curr_row}"] = f"SECTION : {section_name}"
            ws[f"A{curr_row}"].font = Font(bold=True, color="FFFFFF")
            ws[f"A{curr_row}"].fill = PatternFill("solid", fgColor=color)
            ws[f"A{curr_row}"].alignment = s["center"]
            
            curr_row += 1
            ws.cell(row=curr_row, column=1, value="Clé").font = Font(bold=True)
            ws.cell(row=curr_row, column=2, value="Paramètre").font = Font(bold=True)
            ws.cell(row=curr_row, column=3, value="Valeur").font = Font(bold=True)
            ws.cell(row=curr_row, column=4, value="Unité").font = Font(bold=True)
            for col in range(1, 5):
                ws.cell(row=curr_row, column=col).fill = s["header_fill_gray"]
                ws.cell(row=curr_row, column=col).border = s["thin"]
                ws.cell(row=curr_row, column=col).alignment = s["center"]
            
            curr_row += 1
            for key, label, default_val, unit in params:
                ws.cell(row=curr_row, column=1, value=key).border = s["thin"]
                ws.cell(row=curr_row, column=2, value=label).border = s["thin"]
                v_cell = ws.cell(row=curr_row, column=3, value=default_val)
                v_cell.fill = s["input_fill"]
                v_cell.border = s["thin"]
                v_cell.alignment = Alignment(horizontal="center")
                ws.cell(row=curr_row, column=4, value=unit).border = s["thin"]
                curr_row += 1
            
            curr_row += 1 # Espacement entre sections

        ws.column_dimensions["B"].width = 28
        ws.column_dimensions["C"].width = 12
        ws.column_dimensions["D"].width = 8

    return wb


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 1: Template Régional
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/template/regional")
def get_regional_template(
    region_id: int = Query(..., description="ID de la région"),
    db: Session = Depends(get_db),
):
    region = db.execute(
        text("SELECT id, label FROM dbo.regions WHERE id = :rid"),
        {"rid": region_id}
    ).mappings().first()

    if not region:
        raise HTTPException(status_code=404, detail="Région introuvable")

    centres = db.execute(
        text("""
            SELECT c.id, c.label, r.label AS region_label
            FROM dbo.centres c
            JOIN dbo.regions r ON r.id = c.region_id
            WHERE c.region_id = :rid
            ORDER BY c.label
        """),
        {"rid": region_id}
    ).mappings().all()

    if not centres:
        raise HTTPException(status_code=404, detail="Aucun centre dans cette région")

    wb = _build_template_workbook([dict(c) for c in centres])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    region_name = region["label"].replace(" ", "_")
    filename = f"template_simulation_{region_name}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 2: Template National
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/template/national")
def get_national_template(db: Session = Depends(get_db)):
    centres = db.execute(
        text("""
            SELECT c.id, c.label, r.label AS region_label
            FROM dbo.centres c
            JOIN dbo.regions r ON r.id = c.region_id
            ORDER BY r.label, c.label
        """)
    ).mappings().all()

    if not centres:
        raise HTTPException(status_code=404, detail="Aucun centre trouvé")

    wb = _build_template_workbook([dict(c) for c in centres])

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_simulation_national.xlsx"},
    )


# ─────────────────────────────────────────────────────────────────────────────
# Parser: Excel → grid_values dict (same format as wizard)
# ─────────────────────────────────────────────────────────────────────────────
def _parse_sheet_grid(ws) -> dict:
    """Parse the canvas rows 5-9, returns grid_values dict matching wizard format."""

    def _v(row, col):
        v = ws.cell(row=row, column=col).value
        try:
            return float(v) if v is not None else 0.0
        except (TypeError, ValueError):
            return 0.0

    grid = {
        "amana": {
            "depot": {
                "gc":   {"global": _v(5, 2), "local": _v(5, 3), "axes": _v(5, 4)},
                "part": {"global": _v(5, 5), "local": _v(5, 6), "axes": _v(5, 7)},
            },
            "recu": {
                "gc":   {"global": _v(5, 8), "local": _v(5, 9), "axes": _v(5, 10)},
                "part": {"global": _v(5, 11), "local": _v(5, 12), "axes": _v(5, 13)},
            },
        },
        "cr": {
            "med":    {"global": _v(6, 2), "local": _v(6, 3), "axes": _v(6, 4)},
            "arrive": {"global": _v(6, 8), "local": _v(6, 9), "axes": _v(6, 10)},
        },
        "co": {
            "med":    {"global": _v(7, 2), "local": _v(7, 3), "axes": _v(7, 4)},
            "arrive": {"global": _v(7, 8), "local": _v(7, 9), "axes": _v(7, 10)},
        },
        "ebarkia": {"med": _v(8, 2), "arrive": _v(8, 8)},
        "lrh":     {"med": _v(9, 2), "arrive": _v(9, 8)},
    }
    return grid


def _parse_sheet_params(ws, start_row: int = 12) -> dict:
    """Scan rows from start_row looking for parameter keys in column 1."""
    params = {}
    # On scanne un range large car la section des paramètres s'est agrandie
    for row in range(start_row, start_row + 100):
        key = ws.cell(row=row, column=1).value
        val = ws.cell(row=row, column=3).value
        if key and isinstance(key, str) and not key.startswith("SECTION"):
            try:
                params[key.strip()] = float(val) if val is not None else None
            except (TypeError, ValueError):
                params[key.strip()] = None
    return params


def _params_to_engine(p: dict) -> BandoengParameters:
    def g(k, default=0.0):
        v = p.get(k)
        return float(v) if v is not None else default

    return BandoengParameters(
        # Globals
        shift=int(g("shift", 1)),
        productivite=g("productivite", 100.0),
        idle_minutes=g("idle_minutes", 0.0),
        coeff_circ=g("coeff_circ", 1.0),
        coeff_geo=g("coeff_geo", 1.0),
        has_guichet=int(g("has_guichet", 1)),
        duree_trajet=g("duree_trajet", 0.0),

        # Mappage des paramètres (Flux vers les champs déjà existants dans le moteur)
        ed_percent=g("ed_percent", 40.0),
        
        # Amana
        amana_pct_collecte=g("amana_pct_collecte", 0.0),
        amana_pct_retour=g("amana_pct_retour", 0.0),
        amana_pct_axes_arrivee=g("amana_pct_axes_arrivee", 0.0),
        amana_pct_axes_depart=g("amana_pct_axes_depart", 0.0),
        amana_pct_national=g("amana_pct_national", 0.0),
        amana_pct_international=g("amana_pct_international", 0.0),
        amana_pct_marche_ordinaire=g("amana_pct_marche_ordinaire", 0.0),
        amana_pct_crbt=g("amana_pct_crbt", 0.0),
        amana_pct_hors_crbt=g("amana_pct_hors_crbt", 0.0),
        colis_amana_par_canva_sac=g("colis_amana_par_canva_sac", 35.0),

        # CO
        co_pct_collecte=g("co_pct_collecte", 0.0),
        co_pct_marche_ordinaire=g("co_pct_marche_ordinaire", 0.0),
        co_pct_axes_arrivee=g("co_pct_axes_arrivee", 0.0),
        co_pct_axes_depart=g("co_pct_axes_depart", 0.0),
        co_pct_vague_master=g("co_pct_vague_master", 0.0),
        co_pct_boite_postale=g("co_pct_boite_postale", 0.0),
        nbr_co_sac=g("nbr_co_sac", 350.0),

        # CR
        cr_pct_collecte=g("cr_pct_collecte", 0.0),
        cr_pct_retour=g("cr_pct_retour", 0.0),
        cr_pct_axes_arrivee=g("cr_pct_axes_arrivee", 0.0),
        cr_pct_axes_depart=g("cr_pct_axes_depart", 0.0),
        cr_pct_national=g("cr_pct_national", 0.0),
        cr_pct_international=g("cr_pct_international", 0.0),
        cr_pct_marche_ordinaire=g("cr_pct_marche_ordinaire", 0.0),
        cr_pct_vague_master=g("cr_pct_vague_master", 0.0),
        cr_pct_boite_postale=g("cr_pct_boite_postale", 0.0),
        cr_pct_crbt=g("cr_pct_crbt", 0.0),
        cr_pct_hors_crbt=g("cr_pct_hors_crbt", 0.0),
        # Consolidation : on utilise cr_par_caisson pour les deux champs du moteur
        nbr_cr_sac=g("cr_par_caisson", 500.0),
        cr_par_caisson=g("cr_par_caisson", 500.0),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Endpoint 3: Simulate Batch
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/simulate")
async def simulate_batch(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Parse the imported Excel file and run Bandoeng simulation for each sheet.
    Returns results per centre + aggregated by region + national total.
    """
    content = await file.read()

    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fichier Excel invalide : {str(e)}")

    # Build a map: centre_label → centre_id + region
    centres_db = db.execute(
        text("""
            SELECT c.id, c.label, r.id AS region_id, r.label AS region_label
            FROM dbo.centres c
            JOIN dbo.regions r ON r.id = c.region_id
        """)
    ).mappings().all()

    label_to_centre = {}
    for c in centres_db:
        label_to_centre[c["label"].strip().lower()] = dict(c)

    results_par_centre = []
    errors = []

    for sheet_name in wb.sheetnames:
        if sheet_name == "Guide":
            continue

        ws = wb[sheet_name]

        # Identify centre from sheet name
        sheet_key = sheet_name.strip().lower()
        match = None
        for key, centre in label_to_centre.items():
            if key.startswith(sheet_key) or sheet_key.startswith(key[:20]):
                match = centre
                break

        if not match:
            errors.append({"sheet": sheet_name, "error": "Centre non trouvé en base"})
            continue

        centre_id = match["id"]
        centre_label = match["label"]
        region_id = match["region_id"]
        region_label = match["region_label"]

        try:
            # ✅ AUTO-IMPORT if empty
            auto_import_tasks_if_empty(db, centre_id)

            grid_values = _parse_sheet_grid(ws)
            raw_params = _parse_sheet_params(ws)
            engine_params = _params_to_engine(raw_params)

            volumes = BandoengInputVolumes(grid_values=grid_values)

            result = run_bandoeng_simulation(db, centre_id, volumes, engine_params)

            results_par_centre.append({
                "centre_id": centre_id,
                "centre_label": centre_label,
                "region_id": region_id,
                "region_label": region_label,
                "fte_calcule": round(result.fte_calcule, 2),
                "fte_arrondi": result.fte_arrondi,
                "total_heures": round(result.total_heures, 2),
                "ressources_par_poste": result.ressources_par_poste,
            })

        except Exception as e:
            errors.append({"sheet": sheet_name, "centre": centre_label, "error": str(e)})

    # Aggregate by region
    par_region: dict = {}
    for r in results_par_centre:
        rid = r["region_id"]
        if rid not in par_region:
            par_region[rid] = {
                "region_id": rid,
                "region_label": r["region_label"],
                "total_fte_calcule": 0.0,
                "total_fte_arrondi": 0,
                "nb_centres": 0,
            }
        par_region[rid]["total_fte_calcule"] += r["fte_calcule"]
        par_region[rid]["total_fte_arrondi"] += r["fte_arrondi"]
        par_region[rid]["nb_centres"] += 1

    national_total = sum(r["fte_calcule"] for r in results_par_centre)
    national_arrondi = sum(r["fte_arrondi"] for r in results_par_centre)

    return {
        "par_centre": results_par_centre,
        "par_region": list(par_region.values()),
        "national": {
            "total_fte_calcule": round(national_total, 2),
            "total_fte_arrondi": national_arrondi,
            "nb_centres": len(results_par_centre),
        },
        "errors": errors,
    }
