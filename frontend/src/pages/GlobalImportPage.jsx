import React, { useState, useEffect } from "react";
import { api, downloadBandoengTasksTemplate } from "../services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Upload, CheckCircle, AlertTriangle, FileDown } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
export default function GlobalImportPage() {
    const [centers, setCenters] = useState([]);
    const [selectedCenters, setSelectedCenters] = useState([]);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const [searchTerm, setSearchTerm] = useState("");

    // Fetch centers on mount
    useEffect(() => {
        fetchCenters();
    }, []);

    const fetchCenters = async () => {
        try {
            setLoading(true);
            // Assuming existing endpoint to list centers. 
            // If not, we might need to adjust based on API availability. 
            // Usually there is /centres or we can use the structure from Sidebar.
            const res = await api.get("/centres");
            setCenters(res.data);
        } catch (err) {
            console.error("Error fetching centers:", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredCenters = centers.filter(c =>
        c.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelectAll = (checked) => {
        if (checked) {
            // Select all filtered centers
            const idsToAdd = filteredCenters.map(c => c.id);
            setSelectedCenters(prev => {
                const newSet = new Set([...prev, ...idsToAdd]);
                return Array.from(newSet);
            });
        } else {
            // Deselect all filtered centers
            const idsToRemove = filteredCenters.map(c => c.id);
            setSelectedCenters(prev => prev.filter(id => !idsToRemove.includes(id)));
        }
    };

    const handleToggleCenter = (id, checked) => {
        if (checked) {
            setSelectedCenters((prev) => [...prev, id]);
        } else {
            setSelectedCenters((prev) => prev.filter((c) => c !== id));
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file || selectedCenters.length === 0) return;

        try {
            setUploading(true);
            setResult(null);

            const formData = new FormData();
            formData.append("file", file);
            // Send JSON string as 'centre_ids'
            formData.append("centre_ids", JSON.stringify(selectedCenters));

            const res = await api.post("/bandoeng/import/tasks", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            setResult(res.data);
        } catch (err) {
            console.error(err);
            setResult({
                success: false,
                errors: [err.response?.data?.detail || "Erreur lors de l'importation"]
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await downloadBandoengTasksTemplate();
        } catch (err) {
            console.error("Error downloading template", err);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Mise à jour Référentiel Tâches</h1>
                <Button variant="outline" onClick={handleDownloadTemplate} className="flex items-center gap-2">
                    <FileDown className="h-4 w-4" />
                    Télécharger le modèle
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selection des Centres */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span>Sélection des Centres ({selectedCenters.length})</span>
                                <div className="flex items-center space-x-2 text-sm font-normal">
                                    <Checkbox
                                        checked={filteredCenters.length > 0 && filteredCenters.every(c => selectedCenters.includes(c.id))}
                                        onCheckedChange={handleSelectAll}
                                    />
                                    <span>Tout sélectionner</span>
                                </div>
                            </div>
                            <Input
                                placeholder="Rechercher un centre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            filteredCenters.map((center) => (
                                <div key={center.id} className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded">
                                    <Checkbox
                                        id={`c-${center.id}`}
                                        checked={selectedCenters.includes(center.id)}
                                        onCheckedChange={(checked) => handleToggleCenter(center.id, checked)}
                                    />
                                    <label htmlFor={`c-${center.id}`} className="cursor-pointer flex-1 text-sm font-medium">
                                        {center.label}
                                    </label>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* Upload & Résultats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Importation du Fichier</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <Input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="cursor-pointer"
                                />
                                <p className="text-xs text-gray-500 mt-2">Format supporté: .xlsx, .xls</p>
                            </div>

                            <Button
                                className="w-full"
                                disabled={!file || selectedCenters.length === 0 || uploading}
                                onClick={handleImport}
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Traitement...
                                    </>
                                ) : (
                                    "Lancer la mise à jour"
                                )}
                            </Button>

                            {selectedCenters.length === 0 && (
                                <p className="text-sm text-red-500 text-center">Veuillez sélectionner au moins un centre.</p>
                            )}
                        </CardContent>
                    </Card>

                    {result && (
                        <Card className={result.success ? "border-green-500" : "border-red-500"}>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    {result.success ? <CheckCircle className="text-green-600" /> : <AlertTriangle className="text-red-600" />}
                                    Rapport d'exécution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="grid grid-cols-3 gap-4 text-center mb-4">
                                    <div className="bg-blue-50 p-2 rounded">
                                        <div className="text-2xl font-bold text-blue-600">{result.updated_count || 0}</div>
                                        <div className="text-xs text-blue-800">Mises à jour</div>
                                    </div>
                                    <div className="bg-purple-50 p-2 rounded">
                                        <div className="text-2xl font-bold text-purple-600">{result.duplicate_count || 0}</div>
                                        <div className="text-xs text-purple-800">Duplications</div>
                                    </div>
                                    <div className="bg-orange-50 p-2 rounded">
                                        <div className="text-2xl font-bold text-orange-600">{result.not_found_count || 0}</div>
                                        <div className="text-xs text-orange-800">Non trouvés</div>
                                    </div>
                                </div>

                                {result.errors && result.errors.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-semibold text-sm mb-2 text-red-700">Détails des erreurs / avertissements :</h4>
                                        <div className="max-h-60 overflow-y-auto bg-gray-50 p-2 rounded border text-xs text-gray-700 font-mono">
                                            {result.errors.map((err, idx) => (
                                                <div key={idx} className="border-b border-gray-100 last:border-0 py-1">
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
