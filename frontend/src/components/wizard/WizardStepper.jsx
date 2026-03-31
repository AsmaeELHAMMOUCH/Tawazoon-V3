import React from "react";
import { Check, MapPin, Upload, Sliders, Package, BarChart3 } from "lucide-react";

const STEPS = [
    { number: 1, label: "Centre",           icon: MapPin    },
    { number: 2, label: "Import",           icon: Upload    },
    { number: 3, label: "Paramètres",       icon: Sliders   },
    { number: 4, label: "Ventilation",      icon: Package   },
    { number: 5, label: "Résultats",        icon: BarChart3 },
];

const MODE_CONFIG = {
    actuel:      { label: "Processus Actuel",    color: "bg-slate-100 text-slate-600 border-slate-200"       },
    recommande:  { label: "Processus Consolidé", color: "bg-indigo-50 text-indigo-700 border-indigo-200"     },
    optimise:    { label: "Processus Optimisé",  color: "bg-emerald-50 text-emerald-700 border-emerald-200"  },
    test:        { label: "Mode Test",           color: "bg-amber-50 text-amber-700 border-amber-200"        },
    comparatif:  { label: "Comparatif",          color: "bg-violet-50 text-violet-700 border-violet-200"     },
};

export default function WizardStepper({ currentStep = 1, mode = "actuel", isTestMode = false }) {
    const modeKey  = isTestMode ? "test" : (mode || "actuel");
    const modeConf = MODE_CONFIG[modeKey] || MODE_CONFIG.actuel;

    return (
        <div className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="max-w-4xl mx-auto px-4 h-9 flex items-center gap-3">

                {/* Steps + connectors — prend tout l'espace disponible */}
                <div className="flex-1 flex items-center min-w-0">
                    {STEPS.map((step, index) => {
                        const isCompleted = currentStep > step.number;
                        const isActive    = currentStep === step.number;
                        const Icon        = step.icon;

                        return (
                            <React.Fragment key={step.number}>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className={`
                                        w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300
                                        ${isCompleted
                                            ? "bg-emerald-500 text-white"
                                            : isActive
                                                ? "bg-[#005EA8] text-white ring-2 ring-blue-200 ring-offset-1"
                                                : "bg-slate-100 text-slate-400 border border-slate-200"
                                        }
                                    `}>
                                        {isCompleted
                                            ? <Check className="w-2.5 h-2.5" />
                                            : <Icon  className="w-2.5 h-2.5" />
                                        }
                                    </div>
                                    <span className={`
                                        text-[10px] font-bold whitespace-nowrap transition-colors duration-300 hidden sm:inline
                                        ${isActive    ? "text-[#005EA8]"   :
                                          isCompleted ? "text-emerald-600" : "text-slate-300"}
                                    `}>
                                        {step.label}
                                    </span>
                                </div>

                                {index < STEPS.length - 1 && (
                                    <div className={`
                                        flex-1 h-px mx-2 rounded-full transition-all duration-500
                                        ${isCompleted ? "bg-emerald-400" : "bg-slate-200"}
                                    `} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Séparateur + Mode badge — collé à droite */}
                <div className="shrink-0 flex items-center gap-2">
                    <div className="w-px h-4 bg-slate-200" />
                    <span className={`inline-flex items-center h-5 px-2 rounded-full border text-[9px] font-black uppercase tracking-wider ${modeConf.color}`}>
                        {modeConf.label}
                    </span>
                </div>

            </div>
        </div>
    );
}
