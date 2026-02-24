import React, { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import SeasonalityModule from "@/components/centres_uniq/SeasonalityModule";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

export default function SeasonalityDialog({
    open,
    onOpenChange,
    wizardData,
    postes = []
}) {
    const [loading, setLoading] = useState(false);

    const handleSimulateAnnual = useCallback(async (monthlyPcts) => {
        if (!wizardData?.centre) {
            toast.error("Veuillez sélectionner un centre");
            return null;
        }

        setLoading(true);
        const sum = monthlyPcts.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
        if (Math.abs(sum - 100) > 0.1) {
            toast.error(`Le total doit être de 100% (actuel: ${Math.round(sum * 100) / 100}%)`);
            setLoading(false);
            return null;
        }

        const monthsData = [];
        try {
            for (let i = 0; i < 12; i++) {
                const pct = monthlyPcts[i];

                const payload = {
                    centre_id: wizardData.centre,
                    poste_code: null, // Force full center simulation
                    grid_values: wizardData.gridValues,
                    parameters: {
                        productivite: wizardData.productivite,
                        idle_minutes: wizardData.idleMinutes,
                        shift: wizardData.shift,
                        nature_geo: wizardData.natureGeo,
                        taux_complexite: wizardData.tauxComplexite,
                        duree_trajet: wizardData.dureeTrajet,
                        pct_axes_arrivee: wizardData.pctAxesArrivee,
                        pct_axes_depart: wizardData.pctAxesDepart,
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
                        pct_mois: pct // Crucial parameter for seasonality
                    }
                };

                const data = await api.bandoengSimulate(payload);
                monthsData.push({
                    month: i,
                    totalEtp: data.total_ressources_humaines,
                    intervenants: data.ressources_par_poste || {}
                });
            }
            return { months: monthsData };
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
            <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[95vh] h-fit p-0 overflow-hidden border-none shadow-2xl">
                <SeasonalityModule
                    onSimulateAnnual={handleSimulateAnnual}
                    loading={loading}
                    intervenants={postes.map(p => ({ id: p.id, label: p.label || p.nom_poste }))}
                    className="border-none shadow-none"
                />
            </DialogContent>
        </Dialog>
    );
}
