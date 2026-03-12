import React, { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, Zap, Trash2, CheckCircle2, AlertCircle, Loader2, Filter, Download, FileUp } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function ExclusionTaches() {
    const [mode, setMode] = useState('centre'); // 'centre' or 'typology'
    const [centres, setCentres] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCentre, setSelectedCentre] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [taches, setTaches] = useState([]);
    const [exclusions, setExclusions] = useState([]); // Task IDs for centre mode
    const [quadExclusions, setQuadExclusions] = useState([]); // Quadruplets for typology mode
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [search, setSearch] = useState('');
    const [filterPoste, setFilterPoste] = useState('all');

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (mode === 'centre' && selectedCentre) {
            loadCentreData();
        } else if (mode === 'typology' && selectedCategory) {
            loadTypologyData();
        }
    }, [selectedCentre, selectedCategory, mode]);

    const loadInitialData = async () => {
        try {
            const [centresData, catsData] = await Promise.all([
                api.centres(),
                api.categories()
            ]);
            setCentres(centresData);
            setCategories(catsData);
        } catch (err) {
            console.error(err);
        }
    };

    const loadCentreData = async () => {
        setLoading(true);
        try {
            const [tachesData, exclData] = await Promise.all([
                api.taches({ centreId: selectedCentre }),
                api.getExclusions(selectedCentre)
            ]);
            setTaches(tachesData);
            setExclusions(exclData.ids || []);
        } catch (err) {
            toast.error("Erreur chargement données centre");
        } finally {
            setLoading(false);
        }
    };

    const loadTypologyData = async () => {
        setLoading(true);
        try {
            const [tasks, exclData] = await Promise.all([
                api.getStandardTasks(selectedCategory),
                api.getExclusions(null, selectedCategory)
            ]);
            // Format standard tasks to match UI expectations
            const formatted = tasks.map((t, idx) => ({
                id: `std-${idx}`,
                nom_tache: t.nom,
                produit: t.produit,
                famille_uo: t.famille,
                unite_mesure: t.unite,
                phase: t.phase,
                responsable: 'Standard'
            }));
            setTaches(formatted);
            setQuadExclusions(exclData.quadruplets || []);
        } catch (err) {
            toast.error("Erreur chargement données typologie");
        } finally {
            setLoading(false);
        }
    };

    const cleanQ = (s) => (s || '').toString().replace(/\s+/g, '').toLowerCase();

    const isQuadExcluded = (t) => {
        return quadExclusions.some(q =>
            cleanQ(q.nom) === cleanQ(t.nom_tache) &&
            cleanQ(q.produit) === cleanQ(t.produit) &&
            cleanQ(q.famille) === cleanQ(t.famille_uo) &&
            cleanQ(q.unite) === cleanQ(t.unite_mesure)
        );
    };

    const handleToggle = async (tache) => {
        try {
            let payload = {};
            if (mode === 'centre') {
                payload = { tache_id: tache.id, centre_id: selectedCentre };
            } else {
                payload = {
                    categorie_id: selectedCategory,
                    nom_tache: tache.nom_tache,
                    produit: tache.produit,
                    famille_uo: tache.famille_uo,
                    unite_mesure: tache.unite_mesure
                };
            }

            const res = await api.toggleExclusion(payload);
            if (res.status === 'added') {
                if (mode === 'centre') {
                    setExclusions(prev => [...prev, tache.id]);
                } else {
                    setQuadExclusions(prev => [...prev, {
                        nom: tache.nom_tache,
                        produit: tache.produit,
                        famille: tache.famille_uo,
                        unite: tache.unite_mesure
                    }]);
                }
                toast.success("Tâche exclue");
            } else {
                if (mode === 'centre') {
                    setExclusions(prev => prev.filter(id => id !== tache.id));
                } else {
                    setQuadExclusions(prev => prev.filter(q =>
                        !(cleanQ(q.nom) === cleanQ(tache.nom_tache) &&
                            cleanQ(q.produit) === cleanQ(tache.produit) &&
                            cleanQ(q.famille) === cleanQ(tache.famille_uo) &&
                            cleanQ(q.unite) === cleanQ(tache.unite_mesure))
                    ));
                }
                toast.success("Tâche réintégrée");
            }
        } catch (err) {
            toast.error("Erreur lors de la modification");
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await api.downloadExclusionTemplate();
            toast.success("Modèle téléchargé");
        } catch (err) {
            toast.error("Erreur téléchargement");
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedCategory) return;

        setImporting(true);
        try {
            const res = await api.importExclusions(file, selectedCategory);
            let msg = `${res.created} exclusions ajoutées`;

            if (res.hasErrors) {
                msg += `. ${res.errorsCount} rejets téléchargés sous forme d'Excel.`;
                toast.success(msg, { duration: 6000 });
            } else {
                toast.success(msg);
            }
            loadTypologyData();
        } catch (err) {
            toast.error("Échec de l'importation");
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const uniquePostes = useMemo(() => {
        const p = new Set(taches.map(t => t.responsable).filter(Boolean));
        return Array.from(p).sort();
    }, [taches]);

    const filteredTaches = useMemo(() => {
        return taches.filter(t => {
            const matchesSearch = (t.nom_tache || '').toLowerCase().includes(search.toLowerCase()) ||
                (t.responsable || '').toLowerCase().includes(search.toLowerCase()) ||
                (t.produit || '').toLowerCase().includes(search.toLowerCase());
            const matchesPoste = filterPoste === 'all' || t.responsable === filterPoste;
            return matchesSearch && matchesPoste;
        });
    }, [taches, search, filterPoste]);

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-6xl">
            {/* Header & Mode Switch */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                            <Zap className="w-6 h-6" />
                        </div>
                        Configuration du Processus Optimisé
                    </h1>
                    <div className="flex gap-2 mt-3">
                        <Button
                            variant={mode === 'centre' ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full px-4"
                            onClick={() => { setMode('centre'); setTaches([]); }}
                        >
                            Par Centre
                        </Button>
                        <Button
                            variant={mode === 'typology' ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full px-4"
                            onClick={() => { setMode('typology'); setTaches([]); }}
                        >
                            Par Typologie
                        </Button>
                    </div>
                </div>

                <div className="w-full md:w-80">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">
                        {mode === 'centre' ? 'Choisir un Centre' : 'Choisir une Typologie'}
                    </Label>
                    {mode === 'centre' ? (
                        <Select value={selectedCentre} onValueChange={setSelectedCentre}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="-- Sélectionner un centre --" />
                            </SelectTrigger>
                            <SelectContent>
                                {centres.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.label} ({c.code || c.id})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                                <SelectValue placeholder="-- Sélectionner une typologie --" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {(mode === 'centre' ? selectedCentre : selectedCategory) ? (
                <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                                <Input
                                    className="pl-10 h-10 bg-white border-slate-200 rounded-xl transition-all focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="Rechercher une tâche, produit..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 min-w-fit">
                                <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 font-bold">
                                    {mode === 'centre' ? exclusions.length : quadExclusions.length}
                                </Badge>
                                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-tight">Exclusions {mode === 'typology' ? 'Globales' : 'Actives'}</span>
                            </div>

                            {mode === 'typology' && selectedCategory && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 font-bold text-xs"
                                        onClick={handleDownloadTemplate}
                                    >
                                        <Download className="w-4 h-4" />
                                        Modèle
                                    </Button>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            accept=".xlsx, .xls"
                                            onChange={handleImport}
                                            disabled={importing}
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-50 gap-2 font-bold text-xs"
                                            disabled={importing}
                                        >
                                            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                                            {importing ? 'Importation...' : 'Importer'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="py-24 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                                <p className="text-sm font-medium text-slate-500 animate-pulse">Chargement des tâches...</p>
                            </div>
                        ) : filteredTaches.length > 0 ? (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b-2 border-slate-100">
                                            <TableHead className="w-12 text-center">État</TableHead>
                                            <TableHead className="font-bold text-slate-700">Produit</TableHead>
                                            <TableHead className="font-bold text-slate-700">Désignation Tâche</TableHead>
                                            <TableHead className="font-bold text-slate-700">Famille / UO</TableHead>
                                            <TableHead className="font-bold text-slate-700">Unité</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTaches.map((t) => {
                                            const isExcluded = mode === 'centre' ? exclusions.includes(t.id) : isQuadExcluded(t);
                                            return (
                                                <TableRow key={t.id} className={`transition-colors h-14 ${isExcluded ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}>
                                                    <TableCell className="text-center">
                                                        <div className="flex justify-center">
                                                            {isExcluded ? (
                                                                <AlertCircle className="w-5 h-5 text-amber-500" />
                                                            ) : (
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 font-bold text-[10px]">
                                                            {t.produit || '-'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        {t.nom_tache}
                                                    </TableCell>
                                                    <TableCell className="text-slate-500 text-[11px]">
                                                        {t.famille_uo || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-slate-400 text-[10px] italic">
                                                        {t.unite_mesure || '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant={isExcluded ? "default" : "outline"}
                                                            className={`h-8 px-4 font-bold transition-all shadow-sm ${isExcluded
                                                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                                                }`}
                                                            onClick={() => handleToggle(t)}
                                                        >
                                                            {isExcluded ? "Réintégrer" : "Exclure"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="py-24 text-center">
                                <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Filter className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Aucune tâche trouvée</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                    Assurez-vous qu'un modèle Excel est disponible pour cette typologie.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-24 text-center">
                    <div className="bg-amber-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-6">
                        <Filter className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Sélectionnez une {mode === 'centre' ? 'source' : 'typologie'}</h2>
                    <p className="text-slate-500 max-w-md mx-auto mb-8 font-medium">
                        {mode === 'centre'
                            ? "Choisissez un centre pour configurer ses exclusions locales."
                            : "Choisissez une typologie pour configurer les exclusions automatiques par défaut."}
                    </p>
                </div>
            )}
        </div>
    );
}
