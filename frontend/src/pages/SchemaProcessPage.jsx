import React, { useCallback, useEffect, useState } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Workflow,
  Loader2
} from "lucide-react";
import {
  downloadSchemaProcessImage,
  fetchSchemaProcessManifest,
} from "../services/schemaProcessService";
import EsignLayout from "../components/EsignLayout";

const SchemaProcessPage = () => {
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Charger les données
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    fetchSchemaProcessManifest(controller.signal)
      .then((result) => {
        setManifest(result);
        setCurrentIndex(0);
        setError("");
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message || "Impossible de charger les images.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const images = manifest?.images ?? [];
  const imagesLength = images.length;
  const currentImage = images[currentIndex];

  // Reset index si la liste change
  useEffect(() => {
    if (!imagesLength) {
      setCurrentIndex(0);
      setImageLoading(false);
      return;
    }
    setCurrentIndex((prev) => (prev >= imagesLength ? 0 : prev));
  }, [imagesLength]);

  // Loading state image
  useEffect(() => {
    if (!currentImage) {
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
  }, [currentImage]);

  // Navigation clavier
  useEffect(() => {
    if (!imagesLength) return;
    const handleKey = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [imagesLength]);

  const goPrevious = useCallback(() => {
    if (!imagesLength) return;
    setCurrentIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
  }, [imagesLength]);

  const goNext = useCallback(() => {
    if (!imagesLength) return;
    setCurrentIndex((prev) => (prev + 1) % imagesLength);
  }, [imagesLength]);

  const handleExport = useCallback(async () => {
    if (!currentImage) return;
    setDownloading(true);
    try {
      const { blob, filename } = await downloadSchemaProcessImage(currentImage.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
    }
  }, [currentImage]);

  return (
    <EsignLayout activeKey="Schéma Process">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-4 animate-in fade-in duration-500">

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
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Visualisation des flux et processus opérationnels.
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
                {imagesLength > 0 ? `${currentIndex + 1} / ${imagesLength}` : "0 / 0"}
              </span>
              <h2 className="text-sm font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-md">
                {currentImage?.filename || "Aucun schéma sélectionné"}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomed(!zoomed)}
                title={zoomed ? "Réduire" : "Agrandir"}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all"
              >
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <div className="h-4 w-px bg-slate-300 mx-1" />
              <button
                onClick={goPrevious}
                disabled={imagesLength <= 1}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                disabled={imagesLength <= 1}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>

              <div className="h-4 w-px bg-slate-300 mx-1" />

              <button
                onClick={handleExport}
                disabled={!currentImage || downloading}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 disabled:pointer-events-none"
              >
                {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
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
                onClick={() => setZoomed(!zoomed)}
              >
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-10 backdrop-blur-sm rounded-lg">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                  </div>
                )}
                <img
                  src={currentImage.url}
                  alt={currentImage.filename}
                  className={`max-w-full transition-transform duration-300 shadow-xl rounded-lg bg-white ${zoomed ? 'scale-100 max-h-none' : 'max-h-[60vh] object-contain'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    // Optional: Handle individual image error
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="bg-white border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 flex justify-between items-center">
            <span>Double-cliquez pour zoomer/dézoomer</span>
            <span>Utilisez les flèches du clavier pour naviguer</span>
          </div>

        </div>
      </div>
    </EsignLayout>
  );
};

export default SchemaProcessPage;
