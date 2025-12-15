// src/components/Chart.jsx
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Chart({ data = {} }) {
  const chartData = {
    labels: ["Sacs", "Colis", "Courrier", "Heures Net", "Productivité"],
    datasets: [
      {
        label: "Valeurs de Simulation",
        data: [
          data.sacs ?? 0,
          data.colis ?? 0,
          data.courrier ?? 0,
          data.heuresNet ?? 0,
          data.productivite ?? 0,
        ],
        borderColor: "#005EA8",
        backgroundColor: "rgba(0,94,168,0.2)",
        borderWidth: 2,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "bottom" },
      title: { display: true, text: "Graphique de Simulation RH" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="w-full h-[400px] bg-white rounded-xl border border-slate-200 p-4 shadow-card">
      <Line data={chartData} options={options} />
    </div>
  );
}
