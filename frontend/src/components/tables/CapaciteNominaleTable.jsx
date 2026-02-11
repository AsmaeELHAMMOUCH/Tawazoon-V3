import React, { useState, useMemo } from "react";

export default function CapaciteNominaleTable({ positions = [], centreLabel = "Centre" }) {
    const [filterProduit, setFilterProduit] = useState("");

    const uniqueProduits = useMemo(() => {
        const all = new Set();
        (positions || []).forEach(p => {
            if (p.produit && typeof p.produit === "string") {
                p.produit.split(",").map(s => s.trim()).filter(Boolean).forEach(prod => all.add(prod));
            }
        });
        return Array.from(all).sort();
    }, [positions]);

    const filteredPositions = useMemo(() => {
        return positions.filter(pos => !filterProduit || (pos.produit && pos.produit.includes(filterProduit)));
    }, [positions, filterProduit]);

    const fmt = (n, digits = 0) => {
        const num = Number(n || 0);
        return Number.isFinite(num)
            ? num.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits })
            : "0";
    };
    const fmtBlankZero = (n, digits = 0) => {
        const num = Number(n || 0);
        if (!Number.isFinite(num) || num === 0) return "";
        return fmt(num, digits);
    };

    const totalLines = useMemo(() => {
        const normalizeProdKey = (p) => String(p || "AUTRE").toUpperCase().replace(/[^A-Z0-9]/g, "");

        const totalsByProduct = filteredPositions.reduce((acc, curr) => {
            const prodLabel = curr.produit || "AUTRE";
            const key = normalizeProdKey(prodLabel);

            if (!acc[key]) {
                acc[key] = {
                    produit: prodLabel, // garder le premier libellé rencontré
                    dossiers_par_jour: 0,
                    volume_horaire: 0,
                };
            }
            // Si on voit un libellé plus explicite (ex: avec tiret), on l'utilise pour l'affichage
            if (prodLabel.includes("-") && !acc[key].produit.includes("-")) {
                acc[key].produit = prodLabel;
            }

            const dpj = Number(curr.dossiers_par_jour || 0);
            const vh = Number(curr.volume_activites_par_heure_total || 0);

            // Pour chaque produit, on prend le flux le plus élevé (arrivée ou départ)
            acc[key].dossiers_par_jour = Math.max(acc[key].dossiers_par_jour, dpj);
            acc[key].volume_horaire = Math.max(acc[key].volume_horaire, vh);
            return acc;
        }, {});

        // Effectifs globaux (tous produits confondus)
        const effActGlobal = filteredPositions.reduce((s, p) => s + Number(p.effectif_actuel || 0), 0);
        const effCalcGlobal = filteredPositions.reduce((s, p) => s + Number(p.effectif_calcule || 0), 0);
        const effRecoGlobal = filteredPositions.reduce((s, p) => s + Number(p.effectif_recommande || 0), 0);

        if (process.env.NODE_ENV !== "production") {
            console.group("[CapNom] Agrégation volumes par produit");
            console.log("Entrée filteredPositions:", filteredPositions);
            console.table(Object.entries(totalsByProduct).map(([k, v]) => ({
                produit: k,
                dossiers_par_jour_max: v.dossiers_par_jour,
                volume_horaire_max: v.volume_horaire,
                eff_act_global: effActGlobal,
                eff_calc_global: effCalcGlobal,
                eff_reco_global: effRecoGlobal,
            })));
            console.groupEnd();
        }

        const lines = Object.values(totalsByProduct).map((item) => {
            const dossiers_mois = item.dossiers_par_jour * 22;
            const dossiers_an = dossiers_mois * 12;

            const vm_act_mois = effActGlobal > 0 ? (dossiers_mois / effActGlobal) / 264 : 0;
            const vm_calc_mois = effCalcGlobal > 0 ? (dossiers_mois / effCalcGlobal) / 264 : 0;
            const vm_reco_mois = effRecoGlobal > 0 ? (dossiers_mois / effRecoGlobal) / 264 : 0;

            const vm_act_jour = effActGlobal > 0 ? item.dossiers_par_jour / effActGlobal : 0;
            const vm_calc_jour = effCalcGlobal > 0 ? item.dossiers_par_jour / effCalcGlobal : 0;
            const vm_reco_jour = effRecoGlobal > 0 ? item.dossiers_par_jour / effRecoGlobal : 0;

            const vm_act_heure = effActGlobal > 0 ? item.volume_horaire / effActGlobal : 0;
            const vm_calc_heure = effCalcGlobal > 0 ? item.volume_horaire / effCalcGlobal : 0;
            const vm_reco_heure = effRecoGlobal > 0 ? item.volume_horaire / effRecoGlobal : 0;

            return {
                ...item,
                dossiers_mois,
                dossiers_an,
                // VM masquées (effectifs sont globaux, pas pertinents par produit)
                vm_act_mois: "",
                vm_calc_mois: "",
                vm_reco_mois: "",
                vm_act_jour: "",
                vm_calc_jour: "",
                vm_reco_jour: "",
                vm_act_heure: "",
                vm_calc_heure: "",
                vm_reco_heure: "",
            };
        });

        if (process.env.NODE_ENV !== "production") {
            console.group("[CapNom] Lignes TOTAL calculées");
            console.table(lines);
            console.groupEnd();
        }

        return lines;
    }, [filteredPositions]);

    if (!positions || positions.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-700">Capacité Nominale - {centreLabel}</h3>
                </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">Filtrer par produit:</label>
          <select
            value={filterProduit}
            onChange={(e) => setFilterProduit(e.target.value)}
            className="text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Tous les produits</option>
            {uniqueProduits.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {filterProduit && (
            <button
              onClick={() => setFilterProduit("")}
              className="text-xs text-red-600 hover:text-red-800 font-medium px-2"
            >
              Réinitialiser
            </button>
          )}
        </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th rowSpan="2" className="px-2 py-2 font-semibold text-slate-700 border-r border-slate-200">Position</th>
                                <th rowSpan="2" className="px-2 py-2 font-semibold text-slate-700 border-r border-slate-200 text-center w-20">Produit</th>
                                <th colSpan="1" className="px-2 py-2 font-semibold text-slate-700 border-r border-slate-200 text-center">Volume Activités</th>
                                <th colSpan="3" className="px-2 py-2 font-semibold text-slate-700 border-r border-slate-200 text-center">Volume Moyen / Jour</th>
                                <th colSpan="3" className="px-2 py-2 font-semibold text-slate-700 text-center">Volume Moyen / Heure</th>
                            </tr>
                            <tr>
                                <th className="px-2 py-2 font-semibold text-red-700 bg-red-50/30 border-r border-slate-200 text-right w-24">Mensuel</th>

                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 border-r border-slate-200 text-right w-24">Actuel</th>
                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 border-r border-slate-200 text-right w-24">Calculé</th>
                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 border-r border-slate-200 text-right w-24">Recommandé</th>

                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 border-r border-slate-200 text-right w-24">Actuel</th>
                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 text-right w-24">Calculé</th>
                                <th className="px-2 py-2 font-semibold text-slate-700 bg-slate-50/60 text-right w-24">Recommandé</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
            {totalLines.map((line) => (
                <tr key={line.produit} className="bg-blue-50 font-bold text-slate-800">
                    <td className="px-2 py-1.5 text-left uppercase">MAX {line.produit}</td>
                    <td className="px-2 py-1.5 text-center font-mono text-slate-700 border-r border-slate-200">{line.produit}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-red-700 border-r border-slate-200">{fmt(line.dossiers_mois)}</td>

                                    <td className="px-2 py-1.5 text-right font-mono border-r border-slate-200">{fmtBlankZero(line.vm_act_jour, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono border-r border-slate-200">{fmtBlankZero(line.vm_calc_jour, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono border-r border-slate-200">{fmtBlankZero(line.vm_reco_jour, 2)}</td>

                                    <td className="px-2 py-1.5 text-right font-mono border-r border-slate-200">{fmtBlankZero(line.vm_act_heure, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono border-r border-slate-200">{fmtBlankZero(line.vm_calc_heure, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono">{fmtBlankZero(line.vm_reco_heure, 2)}</td>
                                </tr>
                            ))}

                            {filteredPositions.map((pos, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-2 py-1.5 font-medium text-slate-700 border-r border-slate-100">{pos.poste}</td>
                                    <td className="px-2 py-1.5 text-center text-slate-600 border-r border-slate-100">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                            {pos.produit || "-"}
                                        </span>
                                    </td>

                                    <td className="px-2 py-1.5 text-right font-mono font-bold text-red-700 bg-red-50/10 border-r border-slate-100">
                                        {fmt(pos.dossiers_mois)}
                                    </td>

                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtBlankZero(pos.vm_act_jour, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtBlankZero(pos.vm_calc_jour, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtBlankZero(pos.vm_reco_jour, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtBlankZero(pos.vm_act_heure, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600 border-r border-slate-100">{fmtBlankZero(pos.vm_calc_heure, 2)}</td>
                                    <td className="px-2 py-1.5 text-right font-mono text-slate-600">{fmtBlankZero(pos.vm_reco_heure, 2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
