import React from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Filter, MapPin, Building, Tag } from 'lucide-react';

export default function FiltresContextuels() {
    const {
        region, setRegion,
        centre, setCentre,
        typologie, setTypologie,
        regionsList,
        centresList
    } = useSimulation();

    return (
        <div className="w-full bg-white border-b border-gray-200 p-3 mb-4 rounded-lg shadow-sm flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500 font-medium text-sm mr-2">
                <Filter size={16} />
                <span>Filtres</span>
            </div>

            {/* Région */}
            <div className="flex items-center gap-2 min-w-[200px]">
                <MapPin size={14} className="text-gray-400" />
                <select
                    className="h-9 w-full rounded border border-gray-300 text-sm px-2 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={typeof region === 'object' ? region?.id : region || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        const found = regionsList.find(r => String(r.id) === val);
                        setRegion(found || val); // Set object if found, else ID
                        setCentre(null); // Reset centre when region changes
                    }}
                >
                    <option value="">Toutes les régions</option>
                    {regionsList.map(r => (
                        <option key={r.id} value={r.id}>{r.label || r.libelle}</option>
                    ))}
                </select>
            </div>

            {/* Centre */}
            <div className="flex items-center gap-2 min-w-[200px]">
                <Building size={14} className="text-gray-400" />
                <select
                    className="h-9 w-full rounded border border-gray-300 text-sm px-2 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={typeof centre === 'object' ? centre?.id : centre || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        const found = centresList.find(c => String(c.id) === val);
                        setCentre(found || val);
                    }}
                    disabled={!region} // Disable if no region selected (optional logic, but cleaner)
                >
                    <option value="">{region ? "Tous les centres" : "Sélectionnez une région"}</option>
                    {centresList.map(c => (
                        <option key={c.id} value={c.id}>{c.label || c.libelle}</option>
                    ))}
                </select>
            </div>

            {/* Typologie */}
            <div className="flex items-center gap-2 min-w-[150px]">
                <Tag size={14} className="text-gray-400" />
                <select
                    className="h-9 w-full rounded border border-gray-300 text-sm px-2 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={typologie || ''}
                    onChange={(e) => setTypologie(e.target.value)}
                >
                    <option value="">Toutes typologies</option>
                    <option value="CD">Centre de Distribution</option>
                    <option value="PDC">Plateforme</option>
                    <option value="AGENCE">Agence</option>
                    {/* Add other typologies as needed */}
                </select>
            </div>

        </div>
    );
}
