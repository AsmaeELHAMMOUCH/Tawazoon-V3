import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  BookOpen, // Using BookOpen for Referentiel
  Loader2
} from "lucide-react";
import {
  fetchReferentielManifest,
  downloadReferentielImage,
} from "../services/referentielService";
import EsignLayout from "../components/EsignLayout";

export default function ReferentielPage() {
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPageError("");
    setImageError("");

    fetchReferentielManifest(controller.signal)
      .then((manifest) => {
        const manifestImages = manifest.images ?? [];
        setImages(manifestImages);
        if (manifestImages.length === 0) {
          setPageError(
            manifest.error ||
            "Aucune image trouvée dans Ref1/Ref2. Veuillez vérifier les variables d'environnement."
          );
        } else {
          setPageError("");
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setPageError(err.message || "Impossible de charger le référentiel.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // Reset index if list changes
  useEffect(() => {
    if (images.length === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => (prev >= images.length ? 0 : prev));
  }, [images.length]);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (!currentImage) {
      setImageLoading(false);
      return;
    }
    setImageLoading(true);
    setImageError("");
  }, [currentImage]);

  // Keyboard navigation
  useEffect(() => {
    if (!images.length) return;
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
  }, [images.length]);

  const goPrevious = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handleExport = useCallback(async () => {
    if (!currentImage) return;
    setDownloading(true);
    setImageError("");
    try {
      const { blob, filename } = await downloadReferentielImage(currentImage.id);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setImageError(err.message || "Impossible d'exporter cette image.");
    } finally {
      setDownloading(false);
    }
  }, [currentImage]);

  return (
    <EsignLayout activeKey="Référentiel">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-500">

        {/* Premium Header */}
        <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-slate-200/60 p-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-20 -mt-20 opacity-70" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center flex-col md:flex-row gap-3 text-center md:text-left">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 relative">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center md:justify-start gap-3">
                  Référentiel
                </h1>
                <p className="text-slate-500 mt-0.5 text-xs max-w-xl">
                  Documents de référence et procédures opérationnelles.
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
                {currentImage?.filename || "Aucun document sélectionné"}
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
                <span className="text-xs font-medium">Chargement du référentiel...</span>
              </div>
            ) : pageError ? (
              <div className="flex flex-col items-center justify-center gap-2 text-red-500 p-8 text-center">
                <ImageIcon size={48} className="opacity-20 mb-2" />
                <h3 className="text-sm font-bold">Erreur de chargement</h3>
                <p className="text-xs opacity-80 max-w-xs">{pageError}</p>
              </div>
            ) : !currentImage ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                <ImageIcon size={48} className="opacity-20 mb-2" />
                <p className="text-sm font-medium">Aucun document disponible</p>
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
                {imageError && (
                  <div className="absolute inset-x-0 bottom-4 text-center">
                    <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs border border-red-200 shadow-sm">{imageError}</span>
                  </div>
                )}
                <img
                  src={currentImage.url}
                  alt={currentImage.filename}
                  className={`max-w-full transition-transform duration-300 shadow-xl rounded-lg bg-white ${zoomed ? 'scale-100 max-h-none' : 'max-h-[60vh] object-contain'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError("Erreur de chargement de l'image");
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
}
