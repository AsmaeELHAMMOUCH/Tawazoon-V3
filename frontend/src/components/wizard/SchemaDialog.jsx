import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Network, ChevronLeft, ChevronRight } from "lucide-react";

export default function SchemaDialog({ open, onOpenChange, typologie }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Determine the images to show based on the typology
    const getImagesForTypology = (type) => {
        if (!type) return [];
        const typeUpper = type.toUpperCase().trim();

        if (typeUpper.includes("CM")) {
            return [
                "/schemas/cm1.png",
                "/schemas/cm2.png",
                "/schemas/cm3.png"
            ];
        } else if (typeUpper.includes("CLD")) {
            return ["/schemas/cld.png"];
        } else if (typeUpper.includes("CD") && !typeUpper.includes("CLD") && !typeUpper.includes("CTD")) {
            return ["/schemas/cd.png"];
        } else if (typeUpper.includes("CCC")) {
            return ["/schemas/ccc.png"];
        } else if (typeUpper.includes("AM")) {
            return ["/schemas/am.png"];
        }

        // Default or unmapped typology
        return [];
    };

    const images = getImagesForTypology(typologie);

    const handleNext = () => {
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    // Reset index when dialog opens or typology changes
    React.useEffect(() => {
        if (open) setCurrentImageIndex(0);
    }, [open, typologie]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] lg:max-w-6xl bg-gradient-to-br from-white to-slate-50/30 p-0 overflow-hidden border border-slate-200/60 shadow-2xl rounded-2xl h-[92vh] flex flex-col">
                <DialogHeader className="p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 text-white relative flex-shrink-0">
                    <div className="absolute inset-0 bg-white/5" />
                    <DialogTitle className="text-lg font-bold flex items-center justify-between relative z-10 w-full pr-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Network className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs font-medium opacity-90">Schéma des Flux</div>
                                <div className="text-base font-extrabold">Typologie : {typologie || "Inconnue"}</div>
                            </div>
                        </div>
                        {images.length > 1 && (
                            <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                                <button onClick={handlePrev} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm font-black tabular-nums">
                                    {currentImageIndex + 1} / {images.length}
                                </span>
                                <button onClick={handleNext} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
                    {images.length > 0 ? (
                        <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 overflow-hidden flex justify-center items-center min-h-[400px] max-h-full w-full relative group">
                                <img
                                    src={images[currentImageIndex]}
                                    alt={`Schéma ${typologie} - ${currentImageIndex + 1}`}
                                    className="max-h-full w-full object-contain rounded-lg transition-all duration-300"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                                <div className="hidden flex-col items-center justify-center p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg w-full h-full">
                                    <Network className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm font-medium">Image non trouvée</p>
                                    <p className="text-xs mt-1">Veuillez placer l'image "{images[currentImageIndex]}" dans le dossier public</p>
                                </div>
                            </div>

                            {images.length > 1 && (
                                <div className="flex gap-2 pb-2">
                                    {images.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                            <div className="p-4 bg-white rounded-full shadow-sm">
                                <Network className="w-12 h-12 opacity-30 text-indigo-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-slate-600">Aucun schéma disponible</p>
                                <p className="text-sm mt-1">Il n'y a pas d'image configurée pour la typologie "{typologie}"</p>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
