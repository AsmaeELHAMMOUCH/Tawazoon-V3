import React from "react";

/**
 * Composant d'en-tête unifié pour les pages de simulation des centres uniques.
 * Utilisé pour afficher le titre, la région, l'agence et des contrôles optionnels (ex: sélecteur d'intervenant).
 * 
 * @param {string} title - Titre principal (ex: "Simulation des Effectifs-Bandoeng")
 * @param {string} region - Région (ex: "Region Casa")
 * @param {string} subtitle - Sous-titre ou Agence (ex: "Agence Courrier Bandoeung")
 * @param {React.ReactNode} children - Contenu additionnel (ex: sélecteur d'intervenant)
 * @param {string} className - Classes CSS additionnelles pour le conteneur
 */
const SimulationHeader = ({
    title,
    region,
    subtitle,
    children,
    className = ""
}) => {
    return (
        <div className={`bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 transition-all duration-300 relative overflow-hidden ${className}`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[#005EA8]" />
            
            <div className="flex flex-col pl-1 flex-1 min-w-0">
                <h1 className="text-sm font-bold text-[#005EA8] tracking-tight leading-none mb-0.5 truncate">
                    {title}
                </h1>
                {(region || subtitle) && (
                    <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2 overflow-hidden">
                        {region && <span className="text-[#0A6BBC] text-[8px] sm:text-[9px] shrink-0">{region}</span>}
                        {region && subtitle && <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />}
                        {subtitle && <span className="text-[8px] sm:text-[9px] truncate">{subtitle}</span>}
                    </div>
                )}
            </div>

            {children && (
                <div className="flex items-center gap-2 shrink-0">
                    {children}
                </div>
            )}
        </div>
    );
};

export default SimulationHeader;
