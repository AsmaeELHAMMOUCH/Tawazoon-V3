import React, { useState, useEffect } from 'react';
import { simulationService } from '../services/simulationService';

const VolumesForm = ({ onSubmit, loading }) => {
  const [volumes, setVolumes] = useState(simulationService.createEmptyVolumes());

  const fluxList = [
    { key: 'amana', label: 'Amana', color: '#3182ce' },
    { key: 'co', label: 'Courrier Ordinaire (CO)', color: '#38a169' },
    { key: 'cr', label: 'Courrier Recommandé (CR)', color: '#d69e2e' },
    { key: 'ebarkia', label: 'E-Barkia', color: '#805ad5' },
    { key: 'lrh', label: 'LRH', color: '#e53e3e' }
  ];

  const segments = [
    { key: 'GLOBAL', label: 'Global' },
    { key: 'PART', label: 'Particulier' },
    { key: 'PRO', label: 'Professionnel' },
    { key: 'DIST', label: 'Distribution' },
    { key: 'AXES', label: 'Axes' }
  ];

  const handleFluxChange = (section, fluxKey, segmentKey, value) => {
    const numValue = parseFloat(value) || 0;
    setVolumes(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [fluxKey]: {
          ...prev[section][fluxKey],
          [segmentKey]: numValue
        }
      }
    }));
  };

  const handleGuichetChange = (type, value) => {
    const numValue = parseFloat(value) || 0;
    setVolumes(prev => ({
      ...prev,
      guichet: {
        ...prev.guichet,
        [type]: numValue
      }
    }));
  };

  // Calcul auto du volume/jour
  const calculateDaily = (val) => {
    if (!val) return 0;
    return (val / volumes.nb_jours_ouvres_an).toFixed(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(volumes);
  };

  const renderFluxSection = (sectionKey, title, icon) => (
    <div className="section-card">
      <div className="section-header">
        <span className="section-icon">{icon}</span>
        <h3>{title}</h3>
      </div>

      <div className="flux-container">
        {fluxList.map(flux => (
          <div key={flux.key} className="flux-block" style={{ borderLeftColor: flux.color }}>
            <h4 style={{ color: flux.color }}>{flux.label}</h4>
            <div className="segments-grid">
              {segments.map(seg => {
                const val = volumes[sectionKey][flux.key][seg.key];
                return (
                  <div key={seg.key} className="input-wrapper">
                    <label>{seg.label}</label>
                    <input
                      type="number"
                      min="0"
                      value={val || ''}
                      onChange={(e) => handleFluxChange(sectionKey, flux.key, seg.key, e.target.value)}
                      placeholder="0"
                    />
                    {val > 0 && <span className="daily-hint">≈ {calculateDaily(val)}/j</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="volumes-form">
      <div className="config-bar">
        <label>Jours ouvrés / an :</label>
        <input
          type="number"
          value={volumes.nb_jours_ouvres_an}
          onChange={(e) => setVolumes({ ...volumes, nb_jours_ouvres_an: parseInt(e.target.value) || 264 })}
          className="days-input"
        />
      </div>

      <div className="columns-layout">
        <div className="column">
          {renderFluxSection('flux_arrivee', 'Flux Arrivée', '📥')}
        </div>

        <div className="column">
          {renderFluxSection('flux_depart', 'Flux Départ', '📤')}
        </div>
      </div>

      <div className="section-card guichet-card">
        <div className="section-header">
          <span className="section-icon">🏢</span>
          <h3>Guichet</h3>
        </div>
        <div className="guichet-grid">
          <div className="input-wrapper large">
            <label>Dépôt (Global)</label>
            <input
              type="number"
              value={volumes.guichet.DEPOT || ''}
              onChange={(e) => handleGuichetChange('DEPOT', e.target.value)}
            />
            {volumes.guichet.DEPOT > 0 && <span className="daily-hint">≈ {calculateDaily(volumes.guichet.DEPOT)}/j</span>}
          </div>
          <div className="input-wrapper large">
            <label>Récupération (Global)</label>
            <input
              type="number"
              value={volumes.guichet.RECUP || ''}
              onChange={(e) => handleGuichetChange('RECUP', e.target.value)}
            />
            {volumes.guichet.RECUP > 0 && <span className="daily-hint">≈ {calculateDaily(volumes.guichet.RECUP)}/j</span>}
          </div>
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Simuler...' : 'Lancer la simulation ▶️'}
        </button>
      </div>

      <style>{`
        .volumes-form {
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .config-bar {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .days-input {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          width: 80px;
        }

        .columns-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .section-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          height: 100%;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #f7fafc;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #2d3748;
        }

        .section-icon {
          font-size: 1.5rem;
        }

        .flux-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .flux-block {
          background: #fcfcfc;
          padding: 1rem;
          border-radius: 8px;
          border-left: 4px solid #cbd5e0;
        }

        .flux-block h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .segments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 1rem;
        }

        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .input-wrapper label {
          font-size: 0.75rem;
          color: #718096;
          font-weight: 500;
        }

        .input-wrapper input {
          padding: 0.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          font-size: 0.9rem;
          transition: all 0.2s;
        }

        .input-wrapper input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
          outline: none;
        }

        .daily-hint {
          font-size: 0.7rem;
          color: #718096;
          margin-top: 0.1rem;
        }

        .guichet-card {
          margin-bottom: 2rem;
        }

        .guichet-grid {
          display: flex;
          gap: 2rem;
        }

        .input-wrapper.large input {
          font-size: 1.1rem;
          padding: 0.75rem;
        }

        .actions {
          display: flex;
          justify-content: center;
          padding-bottom: 4rem;
        }

        .submit-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 3rem;
          font-size: 1.2rem;
          font-weight: 600;
          border-radius: 50px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        @media (max-width: 1200px) {
          .columns-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
};

export default VolumesForm;
