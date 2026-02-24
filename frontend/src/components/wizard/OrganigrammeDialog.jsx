import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrganizationalChart from "@/components/centres_uniq/OrganizationalChart";

/**
 * OrganigrammeDialog - Displays organizational chart in a dialog
 * Replicates VueIntervenant's organizational chart functionality
 */
export default function OrganigrammeDialog({
    open,
    onOpenChange,
    wizardData,
    postes = []
}) {
    // Helper to detect MOI postes (same as Step4Results/VueIntervenant)
    const isMoiPoste = (p) => {
        if (!p) return false;
        const type = (p.type_poste || p.type || "").toUpperCase();
        return type === "MOI" || type === "INDIRECT" || type === "STRUCTURE" || !!p.is_moi;
    };

    // Helper to categorize staff (same as VueIntervenant)
    const getCategory = (poste) => {
        if (poste.category) return poste.category;
        const label = (poste.label || poste.nom_poste || poste.poste_label || "").toUpperCase();
        if (label.includes("GUICHET") || label.includes("GAB")) return "GUICHET";
        if (label.includes("FACTEUR") || label.includes("DISTRIBUTION")) return "TERRAIN";
        if (label.includes("CHAUFFEUR")) return "CHAUFFEUR / COURSIER";
        if (label.includes("TRI") || label.includes("ACHEMINEMENT") || label.includes("OPERATIONS") || label.includes("BRIGADE") || label.includes("CTD")) return "OPERATION CTD";
        if (label.includes("ACCUEIL") || label.includes("CLIENTELE") || label.includes("ADMIN") || label.includes("RH") || label.includes("MOYENS")) return "OPERATION ADMIN";
        if (label.includes("MANUTENTION")) return "MANUTENTION";
        return "AUTRES";
    };

    // Prepare Chef de Centre data
    const chefCentre = React.useMemo(() => {
        const chef = postes.find(p => (p.label || p.nom_poste || "").toUpperCase().includes("CHEF"));
        return {
            name: chef?.label || chef?.nom_poste || "Chef de Centre",
            effectif: 1
        };
    }, [postes]);

    // Prepare MOI staff filtered from postes
    const moiStaff = React.useMemo(() => {
        return postes
            .filter(p => isMoiPoste(p) && !(p.label || p.nom_poste || "").toUpperCase().includes("CHEF"))
            .map(p => ({
                name: p.label || p.nom_poste || "Poste MOI",
                effectif: Math.round(Number(p.effectif_actuel || p.effectif || 0)),
                type: p.type_poste || "MOI",
                category: getCategory(p)
            }));
    }, [postes]);

    // Prepare MOD staff from simulation results
    const modStaff = React.useMemo(() => {
        const resDict = wizardData?.simulationResults?.ressources_par_poste;
        if (!resDict || typeof resDict !== 'object') return [];

        // In Bandoeng, we iterate over the simulation results dictionary
        return Object.entries(resDict).map(([posteName, fte]) => {
            // Find the original poste object to get categorization correct
            const posteOrigine = postes.find(p => (p.label || p.nom_poste || "").trim().toUpperCase() === posteName.trim().toUpperCase());

            // Exclude Chef and MOI from MOD section (already handled)
            if (posteName.toUpperCase().includes("CHEF") || (posteOrigine && isMoiPoste(posteOrigine))) {
                return null;
            }

            return {
                name: posteName,
                effectif: Math.round(Number(fte || 0)),
                type: "MOD",
                category: posteOrigine ? getCategory(posteOrigine) : "AUTRES"
            };
        }).filter(Boolean);
    }, [wizardData?.simulationResults?.ressources_par_poste, postes]);

    // Get total ETP for display in header
    const totalETP = React.useMemo(() => {
        const modTotal = modStaff.reduce((sum, staff) => sum + (staff.effectif || 0), 0);
        const moiTotal = moiStaff.reduce((sum, staff) => sum + (staff.effectif || 0), 0);
        return modTotal + moiTotal + (chefCentre.effectif || 1);
    }, [modStaff, moiStaff, chefCentre]);

    const centerName = wizardData?.selectedCenter?.nom_centre || "Centre";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[95vw] h-[75vh] flex flex-col overflow-hidden p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] shadow-md">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Organigramme</h2>
                                <p className="text-sm text-slate-500">{centerName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
                            <span className="text-xs font-medium text-slate-600">Effectif Total</span>
                            <span className="text-sm font-bold text-slate-900">{Math.round(totalETP)} ETP</span>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 w-full min-h-0 relative bg-slate-50/30 overflow-auto">
                    <OrganizationalChart
                        chefCentre={chefCentre}
                        moiStaff={moiStaff}
                        modStaff={modStaff}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
