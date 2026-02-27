import React, { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import SeasonalityModuleC from "@/components/centres_uniq/SeasonalityModuleC";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function SeasonalityDialog({
    open,
    onOpenChange,
    wizardData,
    postes = []
}) {
    const [loading, setLoading] = useState(false);

    const handleSimulateAnnual = useCallback(async (fluxPcts) => {
        if (!wizardData?.centre) {
            toast.error("Veuillez sélectionner un centre");
            return null;
        }

        setLoading(true);

        const baseParams = {
            productivite: wizardData.productivite,
            idle_minutes: wizardData.idleMinutes,
            shift: wizardData.shift,
            coeff_geo: wizardData.natureGeo,
            coeff_circ: wizardData.tauxComplexite,
            duree_trajet: wizardData.dureeTrajet,
            pct_axes: wizardData.pctAxesArrivee,
            pct_local: wizardData.pctAxesDepart,
            pct_national: wizardData.pctNational,
            pct_international: wizardData.pctInternational,
            pct_collecte: wizardData.pctCollecte,
            pct_retour: wizardData.pctRetour,
            pct_marche_ordinaire: wizardData.pctMarcheOrdinaire,
            colis_amana_par_canva_sac: wizardData.colisAmanaParCanvaSac,
            nbr_co_sac: wizardData.nbrCoSac,
            nbr_cr_sac: wizardData.nbrCrSac,
            cr_par_caisson: wizardData.crParCaisson,
            ed_percent: wizardData.edPercent,
            has_guichet: wizardData.hasGuichet,
            amana_pct_collecte: wizardData.amana_pctCollecte,
            amana_pct_retour: wizardData.amana_pctRetour,
            amana_pct_axes_arrivee: wizardData.amana_pctAxesArrivee,
            amana_pct_axes_depart: wizardData.amana_pctAxesDepart,
            amana_pct_national: wizardData.amana_pctNational,
            amana_pct_international: wizardData.amana_pctInternational,
            amana_pct_marche_ordinaire: wizardData.amana_pctMarcheOrdinaire,
            amana_pct_crbt: wizardData.amana_pctCrbt,
            amana_pct_hors_crbt: wizardData.amana_pctHorsCrbt,
            co_pct_collecte: wizardData.co_pctCollecte,
            co_pct_retour: wizardData.co_pctRetour,
            co_pct_axes_arrivee: wizardData.co_pctAxesArrivee,
            co_pct_axes_depart: wizardData.co_pctAxesDepart,
            co_pct_national: wizardData.co_pctNational,
            co_pct_international: wizardData.co_pctInternational,
            cr_pct_collecte: wizardData.cr_pctCollecte,
            cr_pct_retour: wizardData.cr_pctRetour,
            cr_pct_axes_arrivee: wizardData.cr_pctAxesArrivee,
            cr_pct_axes_depart: wizardData.cr_pctAxesDepart,
            cr_pct_national: wizardData.cr_pctNational,
            cr_pct_international: wizardData.cr_pctInternational,
        };

        // fluxPcts : objet { amana: [12], co: [12], cr: [12], lrh: [12], ebarkia: [12] }
        const monthsData = [];
        try {
            const annualData = await api.bandoengSimulate({
                centre_id: wizardData.centre,
                poste_code: null,
                grid_values: wizardData.gridValues,
                parameters: { ...baseParams, pct_mois: null }
            });
            const annualEtp = annualData.fte_arrondi;

            for (let i = 0; i < 12; i++) {
                // Envoyer les pct_mois par flux — le moteur applique le bon % selon le flux de chaque tâche
                const data = await api.bandoengSimulate({
                    centre_id: wizardData.centre,
                    poste_code: null,
                    grid_values: wizardData.gridValues,
                    parameters: {
                        ...baseParams,
                        pct_mois_amana: fluxPcts.amana?.[i] ?? null,
                        pct_mois_co: fluxPcts.co?.[i] ?? null,
                        pct_mois_cr: fluxPcts.cr?.[i] ?? null,
                        pct_mois_lrh: fluxPcts.lrh?.[i] ?? null,
                        pct_mois_ebarkia: fluxPcts.ebarkia?.[i] ?? null,
                    }
                });
                monthsData.push({
                    month: i,
                    totalEtp: data.total_ressources_humaines,
                    intervenants: data.ressources_par_poste || {}
                });
            }
            return { months: monthsData, annualEtp };
        } catch (error) {
            console.error("Simulation annuelle error:", error);
            toast.error("Erreur lors de la simulation annuelle");
            return null;
        } finally {
            setLoading(false);
        }
    }, [wizardData]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[98vw] lg:max-w-7xl max-h-[95vh] h-fit p-0 overflow-hidden border-none shadow-2xl">
                <SeasonalityModuleC
                    onSimulateAnnual={handleSimulateAnnual}
                    loading={loading}
                    intervenants={postes.map(p => ({ id: p.id, label: p.label || p.nom_poste }))}
                    className="border-none shadow-none"
                />
            </DialogContent>
        </Dialog>
    );
}
