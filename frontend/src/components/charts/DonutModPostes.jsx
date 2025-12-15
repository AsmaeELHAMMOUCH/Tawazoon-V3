import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

const DonutModPostes = ({ data, isCurrentDirection, posteCache = {}, loading = false }) => {
  const legendRef = useRef(null);
  const chartRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // Calcul des top 10 postes MOD basés sur les données réelles
  const getTopModPostes = () => {
    const postesMap = new Map();

    // Agrégation de tous les postes MOD
    (data || []).forEach(centre => {
      const postes = posteCache?.[centre.id] || [];
      
      postes.forEach(poste => {
        const type = poste.type_poste?.toUpperCase();
        
        // Ne prendre que les postes MOD ou sans type défini (considérés comme MOD par défaut)
        if (type === 'MOD' || !type) {
          const label = poste.label || 'Poste sans nom';
          const etp = poste.etp_calcule || poste.effectif_actuel || 0;
          
          if (postesMap.has(label)) {
            const existing = postesMap.get(label);
            postesMap.set(label, {
              ...existing,
              etp: existing.etp + etp
            });
          } else {
            postesMap.set(label, {
              poste: label,
              etp: etp
            });
          }
        }
      });
    });

    // Conversion en array et tri par ETP décroissant
    const allPostes = Array.from(postesMap.values())
      .filter(item => item.etp > 0) // Filtrer les postes avec ETP > 0
      .sort((a, b) => b.etp - a.etp);

    // Prendre le top 10
    const top10 = allPostes.slice(0, 10);

    // Calcul des pourcentages
    const totalETP = top10.reduce((sum, item) => sum + item.etp, 0);
    
    return top10.map(item => ({
      poste: item.poste,
      value: totalETP > 0 ? Math.round((item.etp / totalETP) * 100) : 0,
      etp: item.etp
    }));
  };

  const selectedData = getTopModPostes();
  const totalMOD = selectedData.reduce((sum, item) => sum + item.etp, 0);

  const colors = [
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#6B7280'
  ];

  const chartData = useMemo(() => ({
    labels: selectedData.map(item => item.poste),
    datasets: [
      {
        data: selectedData.map(item => item.value),
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('500', '600')),
        borderWidth: 2,
        hoverBackgroundColor: colors.map(color => color.replace('500', '400')),
      },
    ],
  }), [selectedData]);

  const options = useMemo(() => ({
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
            const etp = selectedData[context.dataIndex].etp;
            return `${label}: ${value}% (${etp.toFixed(1)} ETP)`;
          }
        }
      },
      title: {
        display: true,
        text: 'Top 10 Postes MOD',
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
  }), [selectedData]);

  const centerText = useMemo(() => ({
    id: 'centerText',
    beforeDatasetsDraw(chart) {
      const { ctx } = chart;
      
      ctx.save();
      ctx.font = 'bold 20px Inter';
      ctx.fillStyle = '#1F2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data[0]) return;
      const x = meta.data[0].x;
      const y = meta.data[0].y;
      ctx.fillText('Total MOD', x, y - 15);
      
      ctx.font = 'bold 28px Inter';
      ctx.fillStyle = '#06B6D4';
      ctx.fillText(`${totalMOD.toFixed(1)} ETP`, x, y + 15);
    }
  }), [totalMOD]);

  useEffect(() => {
    if (legendRef.current) {
      const { scrollHeight, clientHeight } = legendRef.current;
      setShowScrollIndicator(scrollHeight > clientHeight);
    }
  }, [selectedData]);

  const chartKey = useMemo(() => selectedData.map(item => `${item.poste}:${item.value}`).join('|'), [selectedData]);

  useEffect(() => {
    return () => {
      try { chartRef.current?.destroy?.(); } catch {}
    };
  }, []);

  const isEmpty = !selectedData || selectedData.length === 0;

  return (
    <div className="glass-card p-6 rounded-2xl backdrop-blur-lg bg-white/10 border border-white/20 shadow-xl">
      {/* RÉDUIT la hauteur pour que le cercle soit comme le premier donut */}
      <div className="h-72"> {/* Changé de h-80 à h-72 */}
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
          datasetIdKey="donut-mod-postes"
          ref={chartRef}
          redraw
        />
        )}
      </div>
      
      <div className="mt-4">
        <div 
          ref={legendRef}
          className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-cyan-500 scrollbar-track-cyan-100"
        >
          <div className="space-y-2">
            {selectedData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors[index] }}
                  ></div>
                  <span className="text-gray-700 truncate" title={item.poste}>
                    {item.poste}
                  </span>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0 ml-2">
                  <span className="text-gray-900 font-medium w-8 text-right">
                    {item.value}%
                  </span>
                  <span className="text-gray-500 w-12 text-right">
                    {item.etp.toFixed(1)} ETP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {showScrollIndicator && (
          <div className="text-center mt-2">
            <div className="text-xs text-cyan-600 animate-bounce">
              ↓ Défiler pour voir plus
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonutModPostes;