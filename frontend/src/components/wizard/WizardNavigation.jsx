import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw, Download, CheckCircle2 } from "lucide-react";

export default function WizardNavigation({
    currentStep,
    totalSteps = 4,
    onPrevious,
    onNext,
    onReset,
    canGoNext = true,
    isLastStep = false,
    loading = false,
}) {
    const isFirstStep = currentStep === 1;

    return (
        <div className="flex items-center justify-between gap-4 p-2 bg-white/60 backdrop-blur-md border-t border-slate-200/60 shadow-sm">
            <div className="flex items-center gap-2">
                {/* Reset Button */}
                <Button
                    onClick={onReset}
                    variant="outline"
                    size="sm"
                    className="text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Réinitialiser
                </Button>
            </div>

            <div className="flex items-center gap-2">
                {/* Previous Button */}
                <Button
                    onClick={onPrevious}
                    disabled={isFirstStep || loading}
                    variant="outline"
                    size="default"
                    className="min-w-[120px]"
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Précédent
                </Button>

                {/* Next/Finish Button */}
                {isLastStep ? (
                    <Button
                        onClick={onNext}
                        disabled={!canGoNext || loading}
                        className="min-w-[120px] bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Enregistrer
                    </Button>
                ) : (
                    <Button
                        onClick={onNext}
                        disabled={!canGoNext || loading}
                        className="min-w-[120px] bg-gradient-to-r from-[#005EA8] to-[#0A6BBC] hover:from-[#004e8a] hover:to-[#085a9c] text-white"
                    >
                        Suivant
                        <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
}
