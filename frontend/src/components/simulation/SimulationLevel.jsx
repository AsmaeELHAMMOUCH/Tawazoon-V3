import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

const levelLabels = {
  poste: "Simulation Poste par Centre",
  centre: "Effectif Global Centre (Agrégation)",
  region: "Effectif Global Région (Agrégation)",
  national: "Simulation National (Agrégation)",
};

export default function SimulationLevel({ level, region, centre, poste, scenario }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [simulated, setSimulated] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (region) params.append("region_id", String(region));
      if (centre) params.append("centre_id", String(centre));
      if (poste) params.append("poste_id", String(poste));
      params.append("scenario", scenario);

      const res = await fetch(`${API_BASE}/simulations/${level}?${params}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setSimulated(true);
    } catch (err) {
      console.error(`Erreur lors de la simulation ${level}:`, err);
    } finally {
      setLoading(false);
    }
  };

  // Garde-fous d’affichage
  if (level === "poste" && (!centre || !poste)) return null;
  if (level === "centre" && !centre) return null;
  if (level === "region" && !region) return null;

  return (
    <Card className="p-6 border-l-4 border-l-blue-600">
      {/* Votre JSX */}
    </Card>
  );
}
