import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Upload, Download, Info, Users, AlertCircle
} from "lucide-react";
import toast from 'react-hot-toast';
import { downloadEffectifsTemplate, importEffectifs } from "@/services/api";

export default function EffectifUpdateDialog({ open, onOpenChange, onSuccess, filters }) {
    const fileInputRef = useRef(null);

    const handleDownload = async () => {
        try {
            await downloadEffectifsTemplate(filters.region_id, filters.typologie_id, filters.centre_id);
            toast.success("Modèle effectifs téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle effectifs");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Mise à jour des effectifs en cours...");
        try {
            const result = await importEffectifs(file);

            if (result && result.isErrorFile) {
                // Download the rejected rows Excel file
                const url = window.URL.createObjectURL(new Blob([result.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'Lignes_Rejetees_Effectifs.xlsx');
                document.body.appendChild(link);
                link.click();
                link.remove();

                toast.error(
                    `${result.errorCount} lignes rejetées. ${result.updatedCount} effectifs mis à jour, ${result.createdCount} affectés. Veuillez corriger le fichier téléchargé.`,
                    { id: toastId, duration: 6000 }
                );

                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else if (result && result.status === "success") {
                toast.success(
                    `${result.message}.`,
                    { id: toastId, duration: 5000 }
                );

                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error("Format de fichier invalide ou erreur serveur.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la mise à jour des effectifs", { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                        <Users className="w-5 h-5" />
                        Mise à jour Massive des Effectifs
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Télécharger le modèle</h4>
                                <p className="text-xs text-slate-500">
                                    Téléchargez la liste des postes selon vos filtres actuels.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    className="h-8 text-xs mt-1 hover:text-[#005EA8] hover:bg-blue-50"
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                    Télécharger les effectifs
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">2</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Importer et Upsert</h4>
                                <p className="text-xs text-slate-500">
                                    Modifiez les effectifs ou ajoutez de nouvelles lignes pour affecter des postes.
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
                                        Importer pour Mise à jour
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                        <div className="flex gap-2 text-xs text-slate-600">
                            <Info className="w-4 h-4 text-blue-500 shrink-0" />
                            <p>Le système identifie le centre et le poste par leurs **Noms exacts**.</p>
                        </div>
                        <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <p>
                                Pour affecter un **nouveau poste** à un centre, ajoutez simplement une ligne dans le fichier avec le nom du centre et du poste.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
