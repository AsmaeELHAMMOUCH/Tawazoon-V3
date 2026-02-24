import React from "react";
import { Check, MapPin, Sliders, Package, BarChart3 } from "lucide-react";

const STEPS = [
    { number: 1, label: "Centre", icon: MapPin },
    { number: 2, label: "Paramètres", icon: Sliders },
    { number: 3, label: "Volumes", icon: Package },
    { number: 4, label: "Résultats", icon: BarChart3 },
];

export default function WizardStepper({ currentStep = 1 }) {
    return (
        <div className="w-full bg-white/60 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
            <div className="max-w-4xl mx-auto px-6 py-2">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => {
                        const isCompleted = currentStep > step.number;
                        const isActive = currentStep === step.number;
                        const Icon = step.icon;

                        return (
                            <React.Fragment key={step.number}>
                                {/* Step Circle */}
                                <div className="flex flex-col items-center relative">
                                    <div
                                        className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 shadow-md
                      ${isCompleted
                                                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ring-4 ring-emerald-100"
                                                : isActive
                                                    ? "bg-gradient-to-br from-[#005EA8] to-[#0A6BBC] text-white ring-4 ring-blue-100 scale-110"
                                                    : "bg-slate-100 text-slate-400 border-2 border-slate-200"
                                            }
                    `}
                                    >
                                        {isCompleted ? (
                                            <Check className="w-6 h-6" />
                                        ) : (
                                            <Icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div
                                        className={`
                      mt-2 text-xs font-semibold text-center whitespace-nowrap
                      transition-colors duration-300
                      ${isActive
                                                ? "text-[#005EA8]"
                                                : isCompleted
                                                    ? "text-emerald-600"
                                                    : "text-slate-400"
                                            }
                    `}
                                    >
                                        {step.label}
                                    </div>
                                </div>

                                {/* Connector Line */}
                                {index < STEPS.length - 1 && (
                                    <div className="flex-1 h-1 mx-4 relative top-[-20px]">
                                        <div
                                            className={`
                        h-full rounded-full transition-all duration-500
                        ${currentStep > step.number
                                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                                                    : "bg-slate-200"
                                                }
                      `}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
