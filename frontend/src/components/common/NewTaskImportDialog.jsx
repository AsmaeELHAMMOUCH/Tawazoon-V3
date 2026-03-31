import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    PlusCircle, Download, FileWarning, Info, CheckCircle2
} from "lucide-react";
import toast from 'react-hot-toast';
import { downloadNewTasksTemplate, importNewTasks } from "@/services/api";

export default function NewTaskImportDialog({ open, onOpenChange, onSuccess, centreId }) {
    const fileInputRef = useRef(null);

    const handleDownloadTemplate = async () => {
        try {
            await downloadNewTasksTemplate();
            toast.success("Modèle nouvelles tâches téléchargé");
        } catch (error) {
            toast.error("Erreur téléchargement modèle");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Insertion des nouvelles tâches...");
        try {
            const result = await importNewTasks(file, centreId);

            if (result.isErrorFile) {
                // Handle Error Excel Download
                const url = window.URL.createObjectURL(new Blob([result.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'rejet_import_taches.xlsx');
                document.body.appendChild(link);
                link.click();
                link.remove();

                toast.error(
                    `${result.errorCount} tâches rejetées. Le rapport d'erreurs a été téléchargé.`,
                    { id: toastId, duration: 6000 }
                );

                if (result.createdCount > 0) {
                    toast.success(`${result.createdCount} tâches créées avec succès`, { duration: 4000 });
                }

                // Even with errors, if some were created, we refresh
                if (result.createdCount > 0 && onSuccess) onSuccess();
                // We keep dialog open or close based on preference. 
                // Usually better to close if some succeeded or at least clear input.
                onOpenChange(false);
            } else {
                toast.success(
                    `${result.created_count} tâches créées avec succès !`,
                    { id: toastId, duration: 5000 }
                );
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur critique lors de l'importation", { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                        <PlusCircle className="w-5 h-5" />
                        Ajout de Nouvelles Tâches
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Modèle d'importation</h4>
                                <p className="text-xs text-slate-500">
                                    Utilisez ce modèle pour définir vos nouvelles tâches avec responsables et chronos.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownloadTemplate}
                                    className="h-8 text-xs mt-1 hover:text-[#005EA8] hover:bg-blue-50"
                                >
                                    <Download className="w-3.5 h-3.5 mr-2" />
                                    Télécharger le modèle spécifique
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">2</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Importation Directe</h4>
                                <p className="text-xs text-slate-500">
                                    Insérez les tâches dans la base. Le système gère les doublons de responsables.
                                </p>
                                <div className="mt-2 text-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept=".xlsx"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                                    >
                                        <PlusCircle className="w-3.5 h-3.5 mr-2" />
                                        Importer et Créer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="bg-slate-50 p-3 rounded text-xs text-slate-500 flex gap-2">
                            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                <p>Le système créera automatiquement les liens de responsables manquants pour ce centre.</p>
                            </div>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100 text-[11px] text-amber-700 flex gap-2">
                            <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
                            <p>En cas d'erreurs (responsables inconnus), un fichier de rejet sera automatiquement généré.</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
