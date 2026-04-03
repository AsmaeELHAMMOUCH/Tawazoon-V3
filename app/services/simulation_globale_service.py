"""Encapsule la logique métier de la simulation globale en reproduction fidèle."""
from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

import pyodbc

from app.db.connection import DatabaseConnectionError, get_connection

postes_fixes = [
    "chef service",
    "chargé archives",
    "chargé réclamation et reporting",
    "chargé contrôle",
    "détaché agence",
]

postes_exclus = [
    "client",
    "agence",
    "compta",
    "automatisation",
]


def normalize_name(value: str) -> str:
    return (value or "").strip().lower()


class SimulationServiceError(Exception):
    """Erreur métier levée par le service de simulation."""
    pass


def _build_calcule_dict(
    cursor: pyodbc.Cursor, sacs: float, dossiers_jour: float, heures_net: float
) -> Dict[str, float]:
    calcule_dict: Dict[str, float] = {}
    cursor.execute("SELECT id_metier, nom_metier FROM METIER")
    for id_metier, nom_metier in cursor.fetchall():
        nom_clean = normalize_name(nom_metier)
        if nom_clean in postes_exclus:
            continue
        if nom_clean in postes_fixes or nom_clean == "chargé stock":
            calcule_dict[nom_clean] = 1
            continue

        cursor.execute(
            "SELECT minutes_tache, secondes_tache, unite FROM Tache WHERE id_metier = ?",
            id_metier,
        )
        total_heures = 0.0
        for minutes, secondes, unite in cursor.fetchall():
            minutes = float(minutes or 0)
            secondes = float(secondes or 0)
            if unite == "Sac":
                volume = sacs
            elif unite == "Demande":
                volume = dossiers_jour
            else:
                volume = 0
            temps_total_minutes = (volume * minutes * 60 + volume * secondes) / 60
            total_heures += temps_total_minutes / 60

        calcule_dict[nom_clean] = round(total_heures / heures_net) if heures_net else 0

    return calcule_dict


def _build_recommande_dict(
    cursor: pyodbc.Cursor, sacs: float, dossiers_jour: float, heures_net: float
) -> Dict[str, float]:
    recommande_dict: Dict[str, float] = {}
    cursor.execute("SELECT id_metier_recommandee, nom_metier_recomande FROM METIER_recommande")
    for id_metier_rec, nom_metier_rec in cursor.fetchall():
        nom_clean_rec = normalize_name(nom_metier_rec)
        if nom_clean_rec in postes_exclus:
            continue
        if nom_clean_rec in postes_fixes:
            recommande_dict[nom_clean_rec] = 1
            continue

        cursor.execute(
            """
                SELECT (minutes_tache_rec + (secondes_tache_rec / 60.0)) AS duree_min, unite_rec
                FROM Tache_rec
                WHERE id_metier_rec = ?
            """,
            id_metier_rec,
        )
        total_minutes_rec = 0.0
        for duree_min, unite_rec in cursor.fetchall():
            duree_min = float(duree_min or 0)
            if unite_rec == "Sac":
                volume = sacs
            elif unite_rec == "Demande":
                volume = dossiers_jour
            else:
                volume = 0
            total_minutes_rec += volume * duree_min

        ratio = total_minutes_rec / (heures_net * 60) if heures_net else 0
        if round(ratio, 2) <= 0.1:
            recommande_value = 0
        else:
            recommande_value = ratio

        recommande_dict[nom_clean_rec] = recommande_value

    return recommande_dict


def _build_rows(
    cursor: pyodbc.Cursor,
    calcule_dict: Dict[str, float],
    recommande_dict: Dict[str, float],
) -> List[Dict[str, Any]]:
    cursor.execute("SELECT nom_metier_recomande, effectif_Actuel_rec FROM METIER_recommande")
    rows: List[Dict[str, Any]] = []
    for nom, actuel_effectif in cursor.fetchall():
        nom_clean = normalize_name(nom)
        if nom_clean in postes_exclus:
            continue
        actuel = int(actuel_effectif or 0)
        if nom_clean in postes_fixes:
            calcule = 1
            recommande = 1
            actuel = 1
        else:
            calcule = int(round(calcule_dict.get(nom_clean, 0)))
            recommande = int(round(recommande_dict.get(nom_clean, 0)))
        ecart_ca = int(round(calcule - actuel))
        ecart_ra = int(round(recommande - actuel))
        ecart_rc = int(round(recommande - calcule))
        rows.append(
            {
                "position": nom,
                "actuel": actuel,
                "calcule": calcule,
                "recommande": recommande,
                "ecart_calcule_vs_actuel": ecart_ca,
                "ecart_recommande_vs_actuel": ecart_ra,
                "ecart_recommande_vs_calcule": ecart_rc,
            }
        )

    rows = [row for row in rows if normalize_name(row["position"]) not in postes_exclus]
    return rows


def _build_total(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    total_actuel = sum(row["actuel"] for row in rows)
    total_calcule = sum(row["calcule"] for row in rows)
    total_recommande = sum(row["recommande"] for row in rows)
    total_ecart_ca = sum(row["ecart_calcule_vs_actuel"] for row in rows)
    total_ecart_ra = sum(row["ecart_recommande_vs_actuel"] for row in rows)
    total_ecart_rc = sum(row["ecart_recommande_vs_calcule"] for row in rows)

    return {
        "position": "TOTAL",
        "actuel": total_actuel,
        "calcule": int(round(total_calcule, 0)),
        "recommande": math.ceil(total_recommande),
        "ecart_calcule_vs_actuel": int(round(total_ecart_ca, 2)),
        "ecart_recommande_vs_actuel": int(round(total_ecart_ra, 2)),
        "ecart_recommande_vs_calcule": int(round(total_ecart_rc, 2)),
    }


def _build_chart(rows: List[Dict[str, Any]], total: Dict[str, Any]) -> Dict[str, List[Any]]:
    categories: List[str] = [row["position"] for row in rows] + [total["position"]]
    return {
        "categories": categories,
        "actuel": [row["actuel"] for row in rows] + [total["actuel"]],
        "calcule": [row["calcule"] for row in rows] + [total["calcule"]],
        "recommande": [row["recommande"] for row in rows] + [total["recommande"]],
    }


def run_simulation_globale(params: Dict[str, float]) -> Dict[str, Any]:
    sacs = float(params.get("sacs", 0))
    dossiers_mois = float(params.get("dossiers_mois", 0))
    productivite = float(params.get("productivite", 0))

    if productivite <= 0:
        raise SimulationServiceError("La productivité doit être supérieure à 0.")

    heures_net = (8 * productivite) / 100
    jours_ouvrables = 22
    dossiers_jour = dossiers_mois / jours_ouvrables

    rows: List[Dict[str, Any]] = []
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            calcule_dict = _build_calcule_dict(cursor, sacs, dossiers_jour, heures_net)
            recommande_dict = _build_recommande_dict(cursor, sacs, dossiers_jour, heures_net)
            rows = _build_rows(cursor, calcule_dict, recommande_dict)

    except DatabaseConnectionError:
        raise
    except pyodbc.Error as exc:
        raise SimulationServiceError("Erreur lors de l'accès aux données de simulation.") from exc

    total = _build_total(rows)
    chart = _build_chart(rows, total)

    return {
        "sacs": sacs,
        "dossiers_mois": dossiers_mois,
        "productivite": productivite,
        "dossiers_jour": dossiers_jour,
        "heures_net": heures_net,
        "rows": rows,
        "total": total,
        "chart": chart,
    }
