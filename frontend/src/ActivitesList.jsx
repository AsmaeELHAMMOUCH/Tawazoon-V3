import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

function ActivitesList() {
  const [activites, setActivites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await api.activites();
        setActivites(data);
      } catch {
        setError("Impossible de charger les activités.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h2>Liste des activités</h2>
      {loading && <div>Chargement...</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {!loading && !error && (
        <ul>
          {activites.map(act => (
            <li key={act.id}>{act.nom} ({act.code})</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ActivitesList;

