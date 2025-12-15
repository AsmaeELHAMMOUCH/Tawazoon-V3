import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

const SimulationContext = createContext();

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) {
        throw new Error("useSimulation must be used within a SimulationProvider");
    }
    return context;
};

export const SimulationProvider = ({ children, api }) => {
    /* ================= GLOBALS (Universal) ================= */
    // Productivité (%), Hours/Day, Idle Time (Temps mort)
    const [productivite, setProductivite] = useState(100);
    const [heuresParJour, setHeuresParJour] = useState(8);
    const [tempsMort, setTempsMort] = useState(0);

    // Derived: Heures Nettes
    // Formula: (Productivity / 100) * (Hours - Idle) ?? Or just simple derivation as requested
    // Original logic seen in VueDirection: (productivite / 100) * 8.
    // We will make it more generic: (productivite / 100) * heuresParJour
    // Note: user mentioned "Temps mort" in request. If it impacts net hours, logic should be:
    // Net = (Heures - TempsMort) * (Prod/100) ? Or just Net = (Prod/100)*8 ?
    // User said: "Heures nettes par jour (valeur calculée... la logique existante doit être conservée)"
    // In VueDirection it was `(n(productivite) / 100) * 8`.
    // In VueIntervenant, `heuresNet` was passed as prop.
    // I will implement: Net = (productivite / 100) * heuresParJour. 
    // If Temps Mort is purely informative or used elsewhere, I'll keep it as state.
    const heuresNet = useMemo(() => {
        const prod = parseFloat(productivite) || 0;
        const hours = parseFloat(heuresParJour) || 0;
        // Assuming simple formula based on existing code. 
        // If tempsMort reduces available time: (hours - tempsMort/60) * (prod/100)
        // For now, sticking to the VueDirection formula pattern:
        return (prod / 100) * hours;
    }, [productivite, heuresParJour]);


    /* ================= CONTEXTUAL FILTERS (Intervenant/Centre) ================= */
    // Preserved between view changes
    const [region, setRegion] = useState(null);       // ID or Object
    const [centre, setCentre] = useState(null);       // ID or Object
    const [typologie, setTypologie] = useState(null); // String or ID
    const [direction, setDirection] = useState(null); // Specific for VueDirection if needed, or mapped to Region?

    // When changing views, we don't reset these. They persist.

    /* ================= DATA LOADING (Optional helper) ================= */
    // We might want to load regions/centres here globally or let components do it.
    // For filters, we generally need list of regions/centres.
    const [regionsList, setRegionsList] = useState([]);
    const [centresList, setCentresList] = useState([]);

    // Fetch regions once if api provided
    useEffect(() => {
        if (api && typeof api.regions === 'function') {
            api.regions().then(setRegionsList).catch(console.error);
        }
        // Also fetch directions if needed map to regions
        if (api && typeof api.directions === 'function') {
            // checks if distinct from regions
        }
    }, [api]);

    // Fetch centres when region changes
    useEffect(() => {
        if (region && api && typeof api.centres === 'function') {
            const regId = typeof region === 'object' ? region.id : region;
            api.centres(regId).then(setCentresList).catch(console.error);
        } else {
            setCentresList([]); // reset or keeping all? usually filtering clears list
        }
    }, [region, api]);


    const value = {
        // State
        productivite, setProductivite,
        heuresParJour, setHeuresParJour,
        tempsMort, setTempsMort,
        heuresNet,

        region, setRegion,
        centre, setCentre,
        typologie, setTypologie,
        direction, setDirection, // For VueDirection specific filter if distinguished from Region

        // Data (helpers for filters)
        regionsList,
        centresList,

        // API Reference for convenience
        api
    };

    return (
        <SimulationContext.Provider value={value}>
            {children}
        </SimulationContext.Provider>
    );
};
