import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Upload, Download, Info, FileWarning, FileSpreadsheet
} from "lucide-react";
import toast from 'react-hot-toast';
import { downloadApsTemplate, importAps } from "@/services/api";

export default function ApsUpdateDialog({ open, onOpenChange, onSuccess, filters }) {
    const fileInputRef = useRef(null);

    const handleDownload = async () => {
        try {
            await downloadApsTemplate(filters.region_id, filters.typologie_id);
            toast.success("Modèle APS téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle APS");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Mise à jour des APS en cours...");
        try {
            const result = await importAps(file);

            if (result && result.status === "success") {
                toast.success(
                    `${result.message}.`,
                    { id: toastId, duration: 5000 }
                );

                if (result.errors && result.errors.length > 0) {
                    // Log errors locally but notify user
                    console.warn("Certaines lignes ont échoué :", result.errors);
                    toast.error(`${result.errors.length} centres n'ont pas été trouvés.`, { duration: 6000 });
                }

                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error("Format de fichier invalide ou erreur serveur.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la mise à jour des APS", { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                        <FileSpreadsheet className="w-5 h-5" />
                        Mise à jour Massive des APS
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Télécharger le modèle</h4>
                                <p className="text-xs text-slate-500">
                                    Téléchargez la liste des centres selon vos filtres actuels.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    className="h-8 text-xs mt-1 hover:text-[#005EA8] hover:bg-blue-50"
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                    Télécharger les centres
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">2</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Importer le fichier</h4>
                                <p className="text-xs text-slate-500">
                                    Modifiez les valeurs APS dans le fichier et importez-le.
                                </p>
                                <div className="mt-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".xlsx"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-8 text-xs bg-[#005EA8] hover:bg-[#004e8a] text-white"
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Importer et Mettre à jour
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex gap-2">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                            <p>Le système utilise le **Nom du Centre** pour identifier les lignes.</p>
                            <p className="mt-1 font-medium text-blue-700 italic">Attention : respectez l'orthographe exacte des centres.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
