/**
 * Hook React pour gérer les simulations asynchrones
 * 
 * Ce hook permet de lancer une simulation en arrière-plan
 * et de suivre sa progression en temps réel.
 * 
 * Usage:
 * ```jsx
 * const { startSimulation, status, progress, result, error } = useAsyncSimulation();
 * 
 * const handleSimulate = async () => {
 *   await startSimulation('direction', 5, simulationData);
 * };
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/async';

export const useAsyncSimulation = () => {
    const [taskId, setTaskId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, pending, progress, success, failure
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');

    const pollingInterval = useRef(null);
    const isMounted = useRef(true);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
            }
        };
    }, []);

    /**
     * Démarre le polling pour suivre la progression
     */
    const startPolling = useCallback((taskId) => {
        // Arrêter le polling précédent si existant
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
        }

        // Polling toutes les secondes
        pollingInterval.current = setInterval(async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/task/${taskId}`);
                const data = response.data;

                if (!isMounted.current) return;

                // Mettre à jour l'état
                setStatus(data.state.toLowerCase());
                setProgress(data.progress || 0);
                setStatusMessage(data.status || '');

                // Si terminé (succès ou échec), arrêter le polling
                if (data.state === 'SUCCESS') {
                    setResult(data.result);
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                } else if (data.state === 'FAILURE') {
                    setError(data.error || 'Erreur inconnue');
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                }
            } catch (err) {
                console.error('Erreur polling:', err);
                if (isMounted.current) {
                    setError('Erreur lors de la récupération du statut');
                    clearInterval(pollingInterval.current);
                    pollingInterval.current = null;
                }
            }
        }, 1000);
    }, []);

    /**
     * Lance une simulation asynchrone
     * 
     * @param {string} type - Type de simulation ('direction', 'nationale', 'batch')
     * @param {number|array} id - ID de la direction ou liste d'IDs pour batch
     * @param {object} data - Données de simulation
     */
    const startSimulation = useCallback(async (type, id, data) => {
        // Reset de l'état
        setTaskId(null);
        setStatus('pending');
        setProgress(0);
        setResult(null);
        setError(null);
        setStatusMessage('Lancement de la simulation...');

        try {
            let endpoint;
            let payload = data;

            switch (type) {
                case 'direction':
                    endpoint = `${API_BASE_URL}/simulation/direction/${id}`;
                    break;
                case 'nationale':
                    endpoint = `${API_BASE_URL}/simulation/nationale`;
                    break;
                case 'batch':
                    endpoint = `${API_BASE_URL}/simulation/centres/batch`;
                    payload = { centre_ids: id, ...data };
                    break;
                default:
                    throw new Error(`Type de simulation inconnu: ${type}`);
            }

            // Lancer la simulation
            const response = await axios.post(endpoint, payload);
            const { task_id } = response.data;

            if (!isMounted.current) return;

            setTaskId(task_id);
            setStatus('progress');
            setStatusMessage('Simulation en cours...');

            // Démarrer le polling
            startPolling(task_id);

        } catch (err) {
            console.error('Erreur lancement simulation:', err);
            if (isMounted.current) {
                setStatus('failure');
                setError(err.response?.data?.detail || err.message || 'Erreur inconnue');
            }
        }
    }, [startPolling]);

    /**
     * Annule la simulation en cours
     */
    const cancelSimulation = useCallback(async () => {
        if (!taskId) return;

        try {
            await axios.delete(`${API_BASE_URL}/task/${taskId}`);

            if (pollingInterval.current) {
                clearInterval(pollingInterval.current);
                pollingInterval.current = null;
            }

            if (isMounted.current) {
                setStatus('idle');
                setStatusMessage('Simulation annulée');
                setTaskId(null);
            }
        } catch (err) {
            console.error('Erreur annulation:', err);
        }
    }, [taskId]);

    /**
     * Reset l'état
     */
    const reset = useCallback(() => {
        if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = null;
        }
        setTaskId(null);
        setStatus('idle');
        setProgress(0);
        setResult(null);
        setError(null);
        setStatusMessage('');
    }, []);

    return {
        // État
        taskId,
        status,
        progress,
        result,
        error,
        statusMessage,

        // Actions
        startSimulation,
        cancelSimulation,
        reset,

        // Helpers
        isLoading: status === 'pending' || status === 'progress',
        isSuccess: status === 'success',
        isError: status === 'failure',
        isIdle: status === 'idle',
    };
};


/**
 * Composant exemple d'utilisation
 */
export const AsyncSimulationExample = () => {
    const {
        startSimulation,
        cancelSimulation,
        reset,
        status,
        progress,
        result,
        error,
        statusMessage,
        isLoading,
        isSuccess,
        isError
    } = useAsyncSimulation();

    const handleStartSimulation = async () => {
        await startSimulation('direction', 5, {
            direction_id: 5,
            centres_volumes: [],
            productivite: 0.7,
            heures_jour: 8.0
        });
    };

    return (
        <div className="async-simulation-container">
            <h2>Simulation Asynchrone</h2>

            {/* Boutons de contrôle */}
            <div className="controls">
                <button
                    onClick={handleStartSimulation}
                    disabled={isLoading}
                >
                    Lancer la simulation
                </button>

                {isLoading && (
                    <button onClick={cancelSimulation}>
                        Annuler
                    </button>
                )}

                {(isSuccess || isError) && (
                    <button onClick={reset}>
                        Nouvelle simulation
                    </button>
                )}
            </div>

            {/* Barre de progression */}
            {isLoading && (
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="progress-text">
                        {progress}% - {statusMessage}
                    </p>
                </div>
            )}

            {/* Résultat */}
            {isSuccess && result && (
                <div className="result success">
                    <h3>✅ Simulation terminée avec succès</h3>
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}

            {/* Erreur */}
            {isError && (
                <div className="result error">
                    <h3>❌ Erreur</h3>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};


/**
 * Hook pour vérifier la santé de Celery
 */
export const useCeleryHealth = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/health`);
                setHealth(response.data);
            } catch (err) {
                setHealth({
                    status: 'error',
                    message: 'Impossible de contacter Celery'
                });
            } finally {
                setLoading(false);
            }
        };

        checkHealth();

        // Vérifier toutes les 30 secondes
        const interval = setInterval(checkHealth, 30000);

        return () => clearInterval(interval);
    }, []);

    return { health, loading };
};


/**
 * Composant d'indicateur de santé Celery
 */
export const CeleryHealthIndicator = () => {
    const { health, loading } = useCeleryHealth();

    if (loading) return <div>Vérification...</div>;

    const statusColors = {
        healthy: '#10b981',
        degraded: '#f59e0b',
        unhealthy: '#ef4444',
        error: '#ef4444'
    };

    return (
        <div
            className="celery-health"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: '#f3f4f6'
            }}
        >
            <div
                style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: statusColors[health?.status] || '#6b7280'
                }}
            />
            <span style={{ fontSize: '14px' }}>
                {health?.message || 'Statut inconnu'}
            </span>
            {health?.workers_online > 0 && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    ({health.workers_online} worker{health.workers_online > 1 ? 's' : ''})
                </span>
            )}
        </div>
    );
};


// Export par défaut
export default useAsyncSimulation;
