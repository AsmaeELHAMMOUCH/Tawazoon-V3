import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Upload, Download, Info, FileWarning
} from "lucide-react";
import toast from 'react-hot-toast';
import { downloadBandoengTasksTemplate, importBandoengTasks } from "@/services/api";

export default function TaskImportDialog({ open, onOpenChange, onSuccess, centreId, regionId }) {
    const taskFileInputRef = useRef(null);

    const handleDownloadTemplate = async () => {
        try {
            await downloadBandoengTasksTemplate(centreId, regionId);
            toast.success("Modèle tâches téléchargé avec succès");
        } catch (error) {
            toast.error("Erreur téléchargement modèle tâches");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Mise à jour des tâches en cours...");
        try {
            const result = await importBandoengTasks(file, centreId);

            if (result.isErrorFile) {
                // Handle Error Excel Download
                const url = window.URL.createObjectURL(new Blob([result.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'rejet_mise_a_jour_taches.xlsx');
                document.body.appendChild(link);
                link.click();
                link.remove();

                toast.error(
                    `${result.errorCount} échecs. Le rapport de rejet a été téléchargé.`,
                    { id: toastId, duration: 6000 }
                );

                if (result.updatedCount > 0) {
                    toast.success(`${result.updatedCount} tâches mises à jour`, { duration: 4000 });
                }

                // Close and refresh
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else if (result && result.success) {
                const dupMsg = result.duplicate_count > 0 ? `, ${result.duplicate_count} dupliquée(s)` : "";
                toast.success(
                    `${result.updated_count} tâche(s) mise(s) à jour${dupMsg}.`,
                    { id: toastId, duration: 5000 }
                );

                // Close dialog and call success callback
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la mise à jour des tâches", { id: toastId });
        } finally {
            if (taskFileInputRef.current) taskFileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                        <Upload className="w-5 h-5" />
                        Mise à jour des Tâches
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Télécharger le modèle</h4>
                                <p className="text-xs text-slate-500">
                                    Téléchargez le fichier Excel modèle pour préparer vos données.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="h-8 text-xs mt-1 hover:text-[#005EA8] hover:bg-blue-50"
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                    Télécharger le modèle
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold shrink-0">2</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Importer le fichier</h4>
                                <p className="text-xs text-slate-500">
                                    Sélectionnez votre fichier rempli pour mettre à jour les chronos et responsables.
                                </p>
                                <div className="mt-2 text-center">
                                    <input
                                        type="file"
                                        ref={taskFileInputRef}
                                        className="hidden"
                                        accept=".xlsx"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        onClick={() => taskFileInputRef.current?.click()}
                                        className="h-8 text-xs bg-[#005EA8] hover:bg-[#004e8a] text-white w-full"
                                    >
                                        <Upload className="w-3.5 h-3.5 mr-2" />
                                        Mettre à jour
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex gap-2">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <p>Le système identifiera les tâches par leur Nom, Produit, Famille et Unité.</p>
                                <p className="mt-1">Si deux responsables sont renseignés, la tâche sera dupliquée automatiquement.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100 text-[11px] text-amber-700 flex gap-2">
                            <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
                            <p>Les lignes non trouvées ou avec responsables inconnus généreront un fichier de rejet.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
