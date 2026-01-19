import React from 'react';
import { formatHeures, formatVolume } from '../services/simulationDataDriven';

const SimulationResults = ({ result, onReset }) => {
  const getETPStatus = (fte) => {
    if (fte === 0) return { label: 'Aucun', color: '#94a3b8', icon: '⚪' };
    if (fte < 5) return { label: 'Faible', color: '#10b981', icon: '🟢' };
    if (fte < 15) return { label: 'Moyen', color: '#3b82f6', icon: '🔵' };
    if (fte < 30) return { label: 'Élevé', color: '#f59e0b', icon: '🟡' };
    return { label: 'Très élevé', color: '#ef4444', icon: '🔴' };
  };

  const status = getETPStatus(result?.fte_arrondi || 0);

  if (!result) return null;

  return (
    <div className="simulation-results">
      {/* Header avec ETP */}
      <div className="results-header">
        <div className="header-content">
          <h2>Résultats de la simulation</h2>
          <p className="subtitle">Architecture data-driven - Calcul automatique</p>
        </div>
        <div className="etp-badge" style={{ background: status.color }}>
          <span className="etp-icon">{status.icon}</span>
          <div className="etp-content">
            <span className="etp-label">Effectifs calculés</span>
            <span className="etp-value">{result?.fte_arrondi || 0}</span>
            <span className="etp-status">{status.label}</span>
          </div>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">⏱️</div>
          <div className="metric-content">
            <span className="metric-label">Total heures</span>
            <span className="metric-value">{formatHeures(result?.total_heures || 0)}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📅</div>
          <div className="metric-content">
            <span className="metric-label">Heures nettes/jour</span>
            <span className="metric-value">{formatHeures(result?.heures_net_jour || 8)}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <span className="metric-label">Effectifs précis</span>
            <span className="metric-value">{(result.fte_calcule || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <span className="metric-label">Tâches traitées</span>
            <span className="metric-value">{(result?.details_taches || []).length}</span>
          </div>
        </div>
      </div>

      {/* Tableau des tâches */}
      <div className="tasks-section">
        <h3 className="section-title">
          <span className="section-icon">📋</span>
          Détails des tâches
        </h3>

        <div className="table-container">
          <table className="tasks-table">
            <thead>
              <tr>
                <th>Tâche</th>
                <th>Phase</th>
                <th>Unité</th>
                <th>Formule</th>
                <th className="text-right">Nombre d'unités</th>
                <th className="text-right">Temps moyen</th>
                <th className="text-right">Heures</th>
              </tr>
            </thead>
            <tbody>
              {(result?.details_taches || []).map((tache, index) => (
                <tr key={tache.id || `task-${index}`} className="task-row">
                  <td className="task-name">{tache.task}</td>
                  <td className="task-phase">
                    <span className="phase-badge">{tache.phase}</span>
                  </td>
                  <td className="task-unit">
                    <span className="unit-badge">{tache.unit}</span>
                  </td>
                  <td className="task-formula">
                    <code className="formula-code">{tache.formule || 'N/A'}</code>
                  </td>
                  <td className="text-right">{formatVolume(tache.nombre_unite)}</td>
                  <td className="text-right">{((tache.avg_sec || 0) / 60).toFixed(2)} min</td>
                  <td className="text-right">
                    <strong>{formatHeures(tache.heures)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan={6} className="text-right"><strong>Total</strong></td>
                <td className="text-right">
                  <strong className="total-value">{formatHeures(result.total_heures)}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Actions */}
      {onReset && (
        <div className="results-actions">
          <button onClick={onReset} className="btn-secondary">
            <span className="btn-icon">🔄</span>
            Nouvelle simulation
          </button>
        </div>
      )}

      <style>{`
        .simulation-results {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .header-content h2 {
          margin: 0 0 0.5rem 0;
          font-size: 1.75rem;
          color: #2d3748;
        }

        .subtitle {
          margin: 0;
          color: #718096;
          font-size: 0.95rem;
        }

        .etp-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 2rem;
          border-radius: 12px;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .etp-icon {
          font-size: 2.5rem;
        }

        .etp-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .etp-label {
          font-size: 0.85rem;
          opacity: 0.9;
          font-weight: 500;
        }

        .etp-value {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1;
        }

        .etp-status {
          font-size: 0.9rem;
          opacity: 0.95;
          font-weight: 600;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          padding: 1.5rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          transition: all 0.3s;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .metric-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
        }

        .metric-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.9rem;
          color: #718096;
          font-weight: 500;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #2d3748;
        }

        .tasks-section {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #2d3748;
          margin: 0 0 1.5rem 0;
          padding-bottom: 1rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .section-icon {
          font-size: 1.75rem;
        }

        .table-container {
          overflow-x: auto;
        }

        .tasks-table {
          width: 100%;
          border-collapse: collapse;
        }

        .tasks-table th {
          text-align: left;
          padding: 1rem;
          background: #f7fafc;
          color: #4a5568;
          font-weight: 600;
          font-size: 0.9rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .tasks-table th.text-right {
          text-align: right;
        }

        .task-row {
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.2s;
        }

        .task-row:hover {
          background: #f7fafc;
        }

        .tasks-table td {
          padding: 1rem;
          color: #4a5568;
        }

        .task-name {
          font-weight: 600;
          color: #2d3748;
        }

        .phase-badge,
        .unit-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .phase-badge {
          background: #e0e7ff;
          color: #4c51bf;
        }

        .unit-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .task-formula {
          font-family: 'Courier New', monospace;
          font-size: 0.85rem;
        }

        .formula-code {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #f0f4f8;
          border: 1px solid #cbd5e0;
          border-radius: 4px;
          color: #2d3748;
          font-weight: 500;
        }

        .text-right {
          text-align: right;
        }

        .total-row {
          background: #f7fafc;
          font-weight: 700;
        }

        .total-row td {
          padding: 1.25rem 1rem;
          border-top: 2px solid #e2e8f0;
        }

        .total-value {
          color: #667eea;
          font-size: 1.1rem;
        }

        .results-actions {
          display: flex;
          justify-content: center;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid #e2e8f0;
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          font-size: 1rem;
          font-weight: 600;
          color: #667eea;
          background: white;
          border: 2px solid #667eea;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-secondary:hover {
          background: #667eea;
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .btn-icon {
          font-size: 1.2rem;
        }

        @media (max-width: 768px) {
          .simulation-results {
            padding: 1rem;
          }

          .results-header {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .table-container {
            overflow-x: scroll;
          }
        }
      `}</style>
    </div>
  );
};

export default SimulationResults;
