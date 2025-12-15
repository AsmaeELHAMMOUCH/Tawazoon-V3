'use client';

import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/Sidebar';
import { FiltersBar } from '@/components/FiltersBar';
import { SimulationParams } from '@/components/SimulationParams';
import { ComparisonTable } from '@/components/ComparisonTable';
import { StatsCard } from '@/components/StatsCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimulationParams as SimulationParamsType } from '@/types';
import { BarChart3, Table as TableIcon, Users, Building2, TrendingUp, ArrowUpDown } from 'lucide-react';
import { positions } from '@/data/mockData';

function App() {
  const [activeView, setActiveView] = useState('global');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCenter, setSelectedCenter] = useState('all');
  const [showOnlyGaps, setShowOnlyGaps] = useState(false);
  const [compareBy, setCompareBy] = useState('poste');
  const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');

  const [params, setParams] = useState<SimulationParamsType>({
    bagsPerDay: 50,
    filesPerMonth: 6500,
    productivityPercent: 100,
    filesPerDay: 295.45,
    netHoursPerDay: 8,
  });

  const totalCurrent = positions.reduce((sum, p) => sum + p.currentCount, 0);
  const totalRecommended = positions.reduce((sum, p) => sum + p.recommendedCount, 0);
  const totalCalculated = positions.reduce((sum, p) => sum + p.calculatedCount, 0);
  const gapRecommendedVsCurrent = totalRecommended - totalCurrent;
  const gapPercentage = Math.round((gapRecommendedVsCurrent / totalCurrent) * 100);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Vue Globale des Effectifs
              </h1>
              <p className="text-sm text-gray-600 mt-1">Analyse comparative et optimisation des ressources humaines</p>
            </div>
            <Badge variant="outline" className="text-sm px-4 py-2 bg-green-50 text-green-700 border-green-200">
              ● En Ligne
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Effectif Actuel"
              value={totalCurrent}
              icon={Users}
              color="blue"
              subtitle="Total des employés"
            />
            <StatsCard
              title="Effectif Calculé"
              value={totalCalculated}
              icon={BarChart3}
              color="purple"
              subtitle="Selon les paramètres"
            />
            <StatsCard
              title="Effectif Recommandé"
              value={totalRecommended}
              icon={TrendingUp}
              color="green"
              subtitle="Optimisation suggérée"
              trend={gapRecommendedVsCurrent < 0 ? 'down' : 'up'}
              trendValue={`${gapPercentage}%`}
            />
            <StatsCard
              title="Postes Analysés"
              value={positions.length}
              icon={Building2}
              color="red"
              subtitle="Répartition des rôles"
            />
          </div>

          <FiltersBar
            selectedRegion={selectedRegion}
            selectedCategory={selectedCategory}
            selectedCenter={selectedCenter}
            onRegionChange={setSelectedRegion}
            onCategoryChange={setSelectedCategory}
            onCenterChange={setSelectedCenter}
          />

          <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-lg shadow-sm p-4 border-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox id="gaps" checked={showOnlyGaps} onCheckedChange={(checked) => setShowOnlyGaps(!!checked)} />
                <Label htmlFor="gaps" className="text-sm cursor-pointer font-medium text-gray-700">
                  Afficher seulement les écarts
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <Label className="text-sm font-medium text-gray-700">Comparer par</Label>
                <Select value={compareBy} onValueChange={setCompareBy}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poste">Poste</SelectItem>
                    <SelectItem value="region">Région</SelectItem>
                    <SelectItem value="centre">Centre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-md' : ''}
              >
                <TableIcon className="w-4 h-4 mr-2" />
                Tableau
              </Button>
              <Button
                type="button"
                variant={viewMode === 'graph' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('graph')}
                className={viewMode === 'graph' ? 'bg-gradient-to-r from-blue-600 to-blue-700 shadow-md' : ''}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Graphe
              </Button>
            </div>
          </div>

          <SimulationParams params={params} onParamsChange={setParams} />

          {viewMode === 'table' && <ComparisonTable />}
          {viewMode === 'graph' && (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Vue graphique</p>
              <p className="text-gray-400 text-sm mt-2">Visualisation des données à implémenter</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
