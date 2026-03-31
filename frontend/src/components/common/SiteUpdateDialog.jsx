import React, { useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Upload, Download, Info, MapPin, AlertCircle
} from "lucide-react";
import toast from 'react-hot-toast';
import { downloadSitesTemplate, importSites } from "@/services/api";

export default function SiteUpdateDialog({ open, onOpenChange, onSuccess, filters }) {
    const fileInputRef = useRef(null);

    const handleDownload = async () => {
        try {
            await downloadSitesTemplate(filters.region_id, filters.centre_id);
            toast.success("Modèle sites rattachés téléchargé");
        } catch (error) {
            toast.error("Erreur téléchargement modèle");
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading("Importation des sites en cours...");
        try {
            const result = await importSites(file);

            if (result && result.isErrorFile) {
                const url = window.URL.createObjectURL(new Blob([result.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'Lignes_Rejetees_Sites.xlsx');
                document.body.appendChild(link);
                link.click();
                link.remove();

                toast.error(
                    `${result.errorCount} lignes rejetées. ${result.successCount} sites importés. Vérifiez le fichier de rejets.`,
                    { id: toastId, duration: 6000 }
                );
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else if (result && result.status === "success") {
                toast.success(result.message, { id: toastId, duration: 5000 });
                onOpenChange(false);
                if (onSuccess) onSuccess();
            } else {
                toast.error("Erreur lors de l'importation.", { id: toastId });
            }
        } catch (error) {
            console.error(error);
            toast.error("Erreur serveur lors de l'importation", { id: toastId });
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-[#005EA8]">
                        <MapPin className="w-5 h-5" />
                        Gestion Massive des Sites Rattachés
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold shrink-0">1</span>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-slate-800">Télécharger le modèle</h4>
                                <p className="text-xs text-slate-500">
                                    Génère un fichier listant les centres pour guider votre saisie.
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
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
                                <h4 className="text-sm font-semibold text-slate-800">Importer les sites</h4>
                                <p className="text-xs text-slate-500">
                                    Ajoutez ou mettez à jour les sites en masse.
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
                                        Choisir le fichier et Importer
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                        <div className="flex gap-2 text-xs text-slate-600">
                            <Info className="w-4 h-4 text-blue-500 shrink-0" />
                            <p>Le système utilise le **Nom du Centre** pour effectuer le rattachement.</p>
                        </div>
                        <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <div className="space-y-1">
                                <p>
                                    Le code du site est généré automatiquement. Si vous importez un site existant (même nom dans le même centre), il sera ignoré pour éviter les doublons.
                                </p>
                                <p className="font-semibold underline">
                                    Pour ajouter plusieurs sites à un même centre : dupliquez la ligne du centre dans Excel et saisissez le nom du nouveau site.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
