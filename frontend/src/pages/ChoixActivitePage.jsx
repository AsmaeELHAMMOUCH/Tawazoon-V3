import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Select from "react-select";
import { api } from "@/lib/api";
import "./ChoixActivitePage.css";

const ChoixActivite = () => {
  const [activites, setActivites] = useState([]);
  const [activiteSelectionnee, setActiviteSelectionnee] = useState("");
  const navigate = useNavigate();

  // animation d'apparition de la carte
  const cardInitial = { opacity: 0, scale: 0.97, y: 30 };
  const cardAnimate = {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 80, damping: 14 },
  };
  const options = activites.map((activite) => ({
    value: activite.code_activite,
    label: activite.nom_activite,
  }));

  useEffect(() => {
    const fetchActivites = async () => {
      try {
        const data = await api.activites();
        setActivites(data);
      } catch (error) {
        console.error("Erreur lors de la récupération des activités :", error);
      }
    };
    fetchActivites();
  }, []);

  const POSTAL_CODES = new Set([
    "POST",
    "POSTALE",
    "POSTAL",
    "ACT_POSTALE",
    "POSTE",
    "ACTIVITE_POSTALE",
    "ACTIVITE POSTALE",
  ]);
  const ESIGN_CODES = new Set(["ESIGN", "E-SIGN", "E_SIGN"]);

  const handleLancerSimulation = () => {
    if (!activiteSelectionnee) {
      alert("Veuillez sélectionner une activité.");
      return;
    }

    localStorage.setItem("selectedActivity", activiteSelectionnee);

    const codeUpper = String(activiteSelectionnee).trim().toUpperCase();
    const selected = activites.find(
      (a) =>
        String(a?.code_activite ?? "")
          .trim()
          .toUpperCase() === codeUpper
    );
    const nameNorm = String(selected?.nom_activite ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();

    if (POSTAL_CODES.has(codeUpper) || nameNorm.includes("POSTAL")) {
      navigate("/app/simulation");
      return;
    }

    if (
      ESIGN_CODES.has(codeUpper) ||
      nameNorm.includes("ESIGN") ||
      nameNorm.includes("E-SIGN") ||
      nameNorm.includes("SIGNATURE")
    ) {
      navigate("/en-cours");
      return;
    }

    navigate("/en-cours");
  };

  return (
    <div className="choix-page">
      {/* couche dégradé foncé au-dessus du background */}
      <div className="choix-overlay" />

      {/* carte centrale */}
      <motion.div
        className="choix-card"
        initial={cardInitial}
        animate={cardAnimate}
      >
        <div className="choix-card-header">
          <div className="choix-logo-container">
            <img
              src="/public/LOGO_tawazoon_RH.png"
              alt="Logo Tawazoon"
              className="choix-logo"
            />
          </div>
          <span className="choix-badge">
            Optimisation des effectifs
          </span>
          <h1 className="choix-title">Sélectionnez une activité</h1>
          <p className="choix-subtitle">
            Choisissez le périmètre métier à analyser. Vous pourrez ajuster les
            volumes après.
          </p>
        </div>

        <div className="choix-field">
          <label className="choix-label">Activité :</label>
          <Select
            classNamePrefix="choix"
            options={options}
            value={options.find(
              (option) => option.value === activiteSelectionnee
            )}
            onChange={(selectedOption) =>
              setActiviteSelectionnee(selectedOption?.value || "")
            }
            placeholder="-- Choisissez une activité --"
            styles={{
              control: (provided) => ({
                ...provided,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: "0.5rem",
                color: "#fff",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                "&:hover": {
                  border: "1px solid rgba(0,116,204,0.9)",
                },
              }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected
                  ? "rgba(0,116,204,0.3)"
                  : "white",
                color: "black",
                "&:hover": {
                  backgroundColor: "rgba(0,116,204,0.1)",
                },
              }),
              singleValue: (provided) => ({
                ...provided,
                color: "#fff",
              }),
              placeholder: (provided) => ({
                ...provided,
                color: "#cfd8e3",
              }),
              menu: (provided) => ({
                ...provided,
                background: "white",
                borderRadius: "0.5rem",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              }),
            }}
          />
        </div>

        <motion.button
          className="choix-button"
          onClick={handleLancerSimulation}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.99, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          Lancer la Simulation
        </motion.button>

        <div className="choix-helper">
          <span className="helper-icon">i</span>
          <span>
            Le choix de l’activité est nécessaire pour commencer la simulation.
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default ChoixActivite;
