import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart2,
  DollarSign,
  GitMerge,
  BookOpen,
  Workflow,
  Clock4,
  LayoutGrid,
  ChevronRight,
  ArrowLeft,
  Users
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";
import esignLogo from "../assets/esign.png";
import "../styles/esign-menu.css";

const sections = [
  {
    title: "PROCESSUS ACTUEL",
    icon: GitMerge,
    items: [
      { label: "Simulation par Position", icon: GitMerge, path: "/app/effectifs-par-position3" },
      { label: "Simulation Globale", icon: LayoutGrid, path: "/app/effectif-global" },
      { label: "Capacité Nominale", icon: Workflow, path: "/app/actuel/normes" },
      { label: "Chronogramme Temps Unitaire", icon: Clock4, path: "/app/actuel/chronogramme/taches" },
      { label: "Référentiel ", icon: BookOpen, path: "/referentiel" },
      { label: "Schéma Processus", icon: Workflow, path: "/schema-process" },
    ],
  },
  {
    title: "PROCESSUS RECOMMANDÉ",
    icon: DollarSign,
    items: [
      { label: "Simulation par Position", icon: GitMerge, path: "/dimensionnement-recommande/position" },
      { label: "Simulation Globale", icon: LayoutGrid, path: "/dimensionnement-recommande/global" },
      { label: "Capacité Nominale", icon: Workflow, path: "/dimensionnement-recommande/normes" },
      { label: "Chronogramme Temps Unitaire", icon: Clock4, path: "/dimensionnement-recommande/chronogramme/taches" },
      { label: "Référentiel ", icon: BookOpen, path: "/referentiel" },
      { label: "Schéma Processus", icon: Workflow, path: "/dimensionnement-recommande/schema-process" },
    ],
  },
  {
    title: "VUE GLOBALE",
    icon: Activity,
    items: [
      { label: "Tableau de Bord Global", icon: Activity, path: "/app/vue-globale/v3" },
      { label: "Ratios", icon: BarChart2, path: "/app/vue-globale/ratios" },
      { label: "Économies Budgétaires", icon: DollarSign, path: "/app/vue-globale/economies-budgetaires" },
      { label: "Comparatif Positions", icon: LayoutGrid, path: "/comparatif-effectifs" },
    ],
  },


];

export default function EsignMenu() {
  const navigate = useNavigate();

  return (
    <div className="esign-page">
      <div className="esign-bg-decoration" />
      <div
        className="esign-watermark"
        style={{ backgroundImage: `url(${esignLogo})` }}
      />

      <header className="esign-header">
        <div className="esign-header-left">
          <button onClick={() => navigate(-1)} className="esign-back-btn">
            <ArrowLeft size={16} />
            <span>Retour</span>
          </button>
          <img
            src={`${API_BASE_URL}/assets/logo/barid`}
            alt="Barid Al-Maghrib"
            className="esign-logo"
          />
        </div>

        <div className="esign-title-container">
          <p className="esign-subtitle">Activité E-Sign</p>
          <h1 className="esign-title">Résultats Dimensionnement</h1>
        </div>

        <div className="esign-header-right">
          <img
            src={`${API_BASE_URL}/assets/logo/almav`}
            alt="Almav"
            className="esign-logo"
          />
        </div>
      </header>

      <main className="esign-main">
        {sections.map((section, idx) => (
          <div key={section.title} className="esign-section" style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className="esign-section-header">
              <section.icon className="esign-section-icon" size={28} strokeWidth={1.5} />
              <h2 className="esign-section-title">{section.title}</h2>
            </div>

            <div className="esign-grid">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    onClick={() => navigate(item.path)}
                    className="esign-card"
                  >
                    <div className="esign-card-icon-wrapper">
                      <Icon size={18} strokeWidth={2} />
                    </div>

                    <div className="esign-card-content">
                      <h3 className="esign-card-title">{item.label}</h3>
                    </div>

                    <ChevronRight className="esign-card-arrow" size={16} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
