"use client";

import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
// importe ici ton composant CentreAvancee réel + ton API de simulation
// import CentreAvanceeUI from "@/components/centre/CentreAvanceeUI";

export default function CentreAvanceePage() {
    const [payload, setPayload] = useState(null);

    useEffect(() => {
        try {
            const payload = JSON.parse(sessionStorage.getItem("CENTRE_AVANCEE_PAYLOAD") || "{}");

            if (!raw) {
                toast.error("Aucune simulation à charger (payload manquant).");
                return;
            }
            const data = JSON.parse(raw);
            setPayload(data);
        } catch (e) {
            console.error(e);
            toast.error("Payload invalide.");
        }
    }, []);

    const runSimulation = useCallback(async () => {
        if (!payload) return;

        try {
            // Exemple : appelle ton endpoint global centre
            // const res = await simulateCentreAvancee(payload);
            // setResult(res);

            toast.success("Simulation Centre Avancée lancée !");
        } catch (e) {
            console.error(e);
            toast.error("Erreur simulation Centre Avancée.");
        }
    }, [payload]);

    useEffect(() => {
        // Option 1: auto-run dès l’arrivée
        if (payload) runSimulation();
    }, [payload, runSimulation]);

    if (!payload) {
        return <div className="p-6 text-sm text-slate-600">Chargement…</div>;
    }

    return (
        <div className="p-4">
            <div className="text-lg font-bold text-slate-800">Centre Avancée</div>
            <div className="text-xs text-slate-500 mt-1">
                Centre: {payload.centre} | Région: {payload.region}
            </div>

            {/* Option 2: UI + bouton simuler */}
            {/* <CentreAvanceeUI initialPayload={payload} /> */}
        </div>
    );
}
