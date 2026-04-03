import React, { useEffect, useState, useCallback } from "react";
import { fetchSchemaManifestRec, exportSchemaImageRec } from "../api/recommande";
import {
    Download,
    Loader2,
    ImageIcon,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    ZoomOut,
    Workflow
} from "lucide-react";
import EsignLayout from "../components/EsignLayout";
import { API_BASE_URL } from "../lib/api";

export default function SchemaProcessRecommandePage() {
    const [manifest, setManifest] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [zoomed, setZoomed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    const loadManifest = async () => {
        try {
            setLoading(true);
            const data = await fetchSchemaManifestRec();
            setManifest(data);
            setCurrentIndex(0);
            setError("");
        } catch (err) {
            console.error(err);
            setError("Impossible de charger le schéma process recommandé.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadManifest();
    }, []);

    const images = manifest?.images || [];
    const currentImage = images[currentIndex];

    // Navigation clavier
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (images.length <= 1) return;
            if (e.key === "ArrowRight") {
                setCurrentIndex((prev) => (prev + 1) % images.length);
            } else if (e.key === "ArrowLeft") {
                setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [images]);

    const handleExport = async () => {
        if (!currentImage) return;
        try {
            setExporting(true);
            const blob = await exportSchemaImageRec();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = currentImage.filename.replace(/\.[^/.]+$/, "") + ".png";
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert("Erreur lors de l'export de l'image.");
        } finally {
            setExporting(false);
        }
    };

    const toggleZoom = () => setZoomed(!zoomed);
    const goNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const goPrevious = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

    return (
        <EsignLayout activeKey="Schéma Process recommandé">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4 animate-in fade-in duration-500">

                {/* Premium Header */}
                <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                                <Workflow className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                                    Schéma Process
                                    <span className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border border-blue-200 shadow-sm translate-y-px">Recommandé</span>
                                </h1>
                                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                                    Visualisation des flux et processus opérationnels .
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">

                    {/* Toolbar */}
                    <div className="border-b border-slate-100 px-4 py-3 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
                                {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : "0 / 0"}
                            </span>
                            <h2 className="text-sm font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-md">
                                {currentImage?.filename || "Aucun schéma sélectionné"}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleZoom}
                                title={zoomed ? "Réduire" : "Agrandir"}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all"
                            >
                                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
                            </button>
                            <div className="h-4 w-px bg-slate-300 mx-1" />
                            <button
                                onClick={goPrevious}
                                disabled={images.length <= 1}
                                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={goNext}
                                disabled={images.length <= 1}
                                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"
                            >
                                <ChevronRight size={18} />
                            </button>

                            <div className="h-4 w-px bg-slate-300 mx-1" />

                            <button
                                onClick={handleExport}
                                disabled={!currentImage || exporting}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                Télécharger
                            </button>
                        </div>
                    </div>

                    {/* Image Viewer */}
                    <div className="flex-1 bg-slate-100/50 relative overflow-auto flex items-center justify-center p-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                                <Loader2 size={32} className="animate-spin text-blue-500" />
                                <span className="text-xs font-medium">Chargement du manifest...</span>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-red-500 p-8 text-center">
                                <ImageIcon size={48} className="opacity-20 mb-2" />
                                <h3 className="text-sm font-bold">Erreur de chargement</h3>
                                <p className="text-xs opacity-80 max-w-xs">{error}</p>
                            </div>
                        ) : !currentImage ? (
                            <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                <ImageIcon size={48} className="opacity-20 mb-2" />
                                <p className="text-sm font-medium">Aucun schéma disponible</p>
                            </div>
                        ) : (
                            <div
                                className={`relative transition-all duration-300 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                                onClick={toggleZoom}
                            >
                                {imageLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10 backdrop-blur-sm rounded-lg">
                                        <Loader2 size={32} className="animate-spin text-blue-500" />
                                    </div>
                                )}
                                <img
                                    src={currentImage.url}
                                    alt={currentImage.filename}
                                    className={`max-w-[90vw] transition-transform duration-300 shadow-xl rounded-lg bg-white ${zoomed ? 'scale-100 max-h-none' : 'max-h-[60vh] object-contain'}`}
                                    onLoad={() => setImageLoading(false)}
                                    onError={() => setImageLoading(false)}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="bg-white border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 flex justify-between items-center">
                        <span>Double-cliquez (ou cliquez) pour zoomer/dézoomer</span>
                        <span>Utilisez les flèches du clavier pour naviguer</span>
                    </div>
                </div>
            </div>
        </EsignLayout>
    );
}
