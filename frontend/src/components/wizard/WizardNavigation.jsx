import React from "react";
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2, Loader2 } from "lucide-react";

export default function WizardNavigation({
    currentStep,
    totalSteps = 5,
    onPrevious,
    onNext,
    onReset,
    canGoNext = true,
    isLastStep = false,
    loading = false,
}) {
    const isFirstStep = currentStep === 1;
    const progress = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

    return (
        <div className="bg-white/80 backdrop-blur-md border-t border-slate-200/70 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
            {/* Progress bar */}
            <div className="h-0.5 bg-slate-100 w-full">
                <div
                    className="h-full bg-gradient-to-r from-[#005EA8] to-[#48cae4] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            <div className="max-w-4xl mx-auto flex items-center justify-between gap-3 px-4 h-11">

                {/* Left — Reset */}
                <button
                    onClick={onReset}
                    title="Réinitialiser"
                    className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-500 text-[10px] font-bold transition-all duration-200"
                >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Réinitialiser</span>
                </button>

                {/* Center — step counter */}
                <span className="text-[10px] font-black text-slate-400 tabular-nums tracking-widest">
                    {currentStep} / {totalSteps}
                </span>

                {/* Right — Prev / Next */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onPrevious}
                        disabled={isFirstStep || loading}
                        className="inline-flex items-center gap-1 h-7 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Précédent</span>
                    </button>

                    {isLastStep ? (
                        <button
                            onClick={onNext}
                            disabled={!canGoNext || loading}
                            className="inline-flex items-center gap-1.5 h-7 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-[10px] font-black shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                        >
                            {loading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <CheckCircle2 className="w-3 h-3" />
                            }
                            Enregistrer
                        </button>
                    ) : (
                        <button
                            onClick={onNext}
                            disabled={!canGoNext || loading}
                            className="inline-flex items-center gap-1 h-7 px-4 rounded-lg bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] text-white text-[10px] font-black shadow-sm shadow-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                        >
                            {loading
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <>
                                    <span className="hidden sm:inline">Suivant</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
