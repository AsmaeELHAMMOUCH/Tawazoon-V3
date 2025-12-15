import React, { useMemo, useRef, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DonutMoiMod = ({ data, isCurrentDirection, posteCache = {}, loading = false }) => {
  const chartRef = useRef(null);
  
  // Calcul des données MOI/MOD basées sur les postes réels
  const calculateMoiModData = () => {
    let moiTotalETP = 0;
    let modTotalETP = 0;

    // Parcourir tous les centres et leurs postes
    (data || []).forEach(centre => {
      const postes = posteCache?.[centre.id] || [];
      
      postes.forEach(poste => {
        const type = poste.type_poste?.toUpperCase();
        const etp = poste.etp_calcule || poste.effectif_actuel || 0;
        
        if (type === 'MOI') {
          moiTotalETP += etp;
        } else if (type === 'MOD') {
          modTotalETP += etp;
        } else {
          modTotalETP += etp;
        }
      });
    });

    const totalETP = moiTotalETP + modTotalETP;
    
    return {
      moi: { 
        value: totalETP > 0 ? Math.round((moiTotalETP / totalETP) * 100) : 0, 
        etp: Math.round(moiTotalETP * 100) / 100
      },
      mod: { 
        value: totalETP > 0 ? Math.round((modTotalETP / totalETP) * 100) : 0, 
        etp: Math.round(modTotalETP * 100) / 100
      },
      totalETP: totalETP
    };
  };

  const selectedData = calculateMoiModData();

  const chartData = useMemo(() => ({
    labels: ['MOI', 'MOD'],
    datasets: [
      {
        data: [selectedData.moi.value, selectedData.mod.value],
        backgroundColor: ['#8B5CF6', '#06B6D4'],
        borderColor: ['#7C3AED', '#0891B2'],
        borderWidth: 2,
        hoverBackgroundColor: ['#7C3AED', '#0891B2'],
      },
    ],
  }), [selectedData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const etp = context.label === 'MOI' ? selectedData.moi.etp : selectedData.mod.etp;
            return `${label}: ${value}% (${etp.toFixed(1)} ETP)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Répartition MOI/MOD',
        font: {
          size: 16,
          weight: '600',
          family: "'Inter', sans-serif"
        },
        color: '#1F2937',
        padding: {
          bottom: 20
        }
      }
    },
  };

  const centerText = useMemo(() => ({
    id: 'centerText',
    beforeDatasetsDraw(chart) {
      const { ctx, data } = chart;
      const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
      
      ctx.save();
      ctx.font = 'bold 20px Inter';
      ctx.fillStyle = '#1F2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data[0]) return;
      const x = meta.data[0].x;
      const y = meta.data[0].y;
      ctx.fillText('Total', x, y - 15);
      
      ctx.font = 'bold 28px Inter';
      ctx.fillStyle = '#8B5CF6';
      ctx.fillText(`${total}%`, x, y + 15);
    }
  }), [selectedData]);

  const chartKey = useMemo(() => `moi:${selectedData.moi.value}|mod:${selectedData.mod.value}`, [selectedData]);

  useEffect(() => {
    return () => {
      try { chartRef.current?.destroy?.(); } catch {}
    };
  }, []);

  const isEmpty = !selectedData || (!selectedData.moi?.etp && !selectedData.mod?.etp);

  return (
    <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-xl">
      {/* Graphique légèrement plus petit pour laisser de la place à la légende étendue */}
      <div className="h-72"> {/* Réduit de h-80 à h-72 */}
        {loading || isEmpty ? (
          <div className="w-full h-full grid place-items-center text-slate-500 text-sm">
            {loading ? 'Chargement des postes…' : 'Aucune donnée à afficher'}
          </div>
        ) : (
          <Doughnut 
            key={chartKey}
            data={chartData} 
            options={options} 
            plugins={[centerText]}
            datasetIdKey="donut-moi-mod"
            ref={chartRef}
            redraw
          />
        )}
      </div>
      
      {/* Légende avec éléments vides pour prendre la même hauteur */}
      <div className="mt-4">
        <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-cyan-100">
          <div className="space-y-2">
            {/* Ligne MOI */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-violet-500"></div>
                <span className="text-gray-700 truncate">MOI</span>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0 ml-2">
                <span className="text-gray-900 font-medium w-8 text-right">
                  {selectedData.moi.value}%
                </span>
                <span className="text-gray-500 w-12 text-right">
                  {selectedData.moi.etp.toFixed(1)} ETP
                </span>
              </div>
            </div>
            
            {/* Ligne MOD */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-cyan-500"></div>
                <span className="text-gray-700 truncate">MOD</span>
              </div>
              <div className="flex items-center space-x-4 flex-shrink-0 ml-2">
                <span className="text-gray-900 font-medium w-8 text-right">
                  {selectedData.mod.value}%
                </span>
                <span className="text-gray-500 w-12 text-right">
                  {selectedData.mod.etp.toFixed(1)} ETP
                </span>
              </div>
            </div>

            {/* Lignes vides pour remplir l'espace (8 lignes comme dans l'autre donut) */}
            {[...Array(8)].map((_, index) => (
              <div key={`empty-${index}`} className="flex items-center justify-between text-sm opacity-0">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full flex-shrink-0 bg-transparent"></div>
                  <span className="text-transparent">Poste vide</span>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0 ml-2">
                  <span className="text-transparent w-8 text-right">0%</span>
                  <span className="text-transparent w-12 text-right">0.0 ETP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Indicateur de défilement (toujours visible pour correspondre à l'autre) */}
        <div className="text-center mt-2">
          <div className="text-xs text-cyan-600 animate-bounce">
            ↓ Défiler pour voir plus
          </div>
        </div>

        {/* Ligne de total */}
       
      </div>
    </div>
  );
};

export default DonutMoiMod;