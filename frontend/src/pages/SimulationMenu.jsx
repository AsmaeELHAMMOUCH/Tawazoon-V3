import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Building,
  BarChart,
  ClipboardList,
  FileText,
  Layers,
  UserCog,
  ListChecks,
  BookText,
  Workflow,
  TimerReset,
} from "lucide-react";

const CHIP_BLUE =
  "bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white shadow-[0_2px_10px_rgba(0,150,255,0.35)] ring-1 ring-white/30";

const HEADER_HEIGHT = 96;
const CARD_H = 120; // hauteur carte

export default function MenuAnalyseEffectifs() {
  const navigate = useNavigate();
  const { section } = useParams(); // "vue-globale" | "actuel" | "recommande"
  const sectionKey = ["vue-globale", "actuel", "recommande"].includes(section)
    ? section
    : "vue-globale";

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // ===== Données =====
  const sectionsMap = {
    "vue-globale": {
      key: "vue-globale",
      title: "Vue Globale",
      chipClass: CHIP_BLUE,
      items: [
        { icon: Layers, title: "Tableau De Bord Global", key: "tableau" },
        { icon: BarChart, title: "Ratios", key: "ratios" },
        { icon: Layers, title: "Économies budgétaires Estimées", key: "economies" },
        { icon: Layers, title: "Comparatif Positions", key: "comparatif" },
      ],
    },
    actuel: {
      key: "actuel",
      title: "Processus Actuel",
      chipClass: CHIP_BLUE,
      items: [
        // Simulations
        { icon: UserCog, title: "Simulation Par Intervenant", key: "simulation", flux: "poste" },
        { icon: ClipboardList, title: "Simulation Par Centre", key: "simulation", flux: "centre" },
        { icon: Building, title: "Simulation par Direction", key: "simulation", flux: "direction" },
        { icon: Users, title: "Simulation par Région", key: "simulation", flux: "regional" },
        { icon: Building, title: "Simulation Nationale", key: "simulation", flux: "national" },
        // Docs
        { icon: FileText, title: "Capacité Nominale", key: "capacite-nominale" },
        { icon: ListChecks, title: "Normes", key: "normes" },
        { icon: BookText, title: "Référentiel", key: "referentiel" },
        { icon: Workflow, title: "Schéma", key: "schema" },
        { icon: TimerReset, title: "Chronogramme", key: "chronogramme" },
      ],
    },
    recommande: {
      key: "recommande",
      title: "Processus Recommandé",
      chipClass: CHIP_BLUE,
      items: [
        // Simulations
        { icon: UserCog, title: "Simulation Par Intervenant", key: "simulation", flux: "poste" },
        { icon: ClipboardList, title: "Simulation Par Centre", key: "simulation", flux: "centre" },
        { icon: Building, title: "Simulation par Direction", key: "simulation", flux: "direction" },
        { icon: Users, title: "Simulation par Région", key: "simulation", flux: "regional" },
        { icon: Building, title: "Simulation Nationale", key: "simulation", flux: "national" },
        // Docs
        { icon: FileText, title: "Capacité Nominale", key: "capacite-nominale" },
        { icon: ListChecks, title: "Normes", key: "normes" },
        { icon: BookText, title: "Référentiel", key: "referentiel" },
        { icon: Workflow, title: "Schéma", key: "schema" },
        { icon: TimerReset, title: "Chronogramme", key: "chronogramme" },
      ],
    },
  };

  const currentSection = sectionsMap[sectionKey];

  // ===== Regroupement pour la disposition =====
  const { simItems, docItems } = useMemo(() => {
    if (sectionKey === "vue-globale")
      return { simItems: currentSection.items, docItems: [] };

    const sims = currentSection.items.filter((i) => i.key === "simulation");
    const docs = currentSection.items.filter((i) => i.key !== "simulation");
    return { simItems: sims, docItems: docs };
  }, [sectionKey, currentSection]);

  // ===== Navigation =====
  const handleCardClick = (item) => {
    if (sectionKey === "vue-globale") {
      const vueRoutes = {
        tableau: "/app/vue-globale/tableau",
        ratios: "/app/vue-globale/ratios",
        economies: "/app/vue-globale/economies-budgetaires",
        comparatif: "/app/vue-globale/comparatif",
      };
      if (vueRoutes[item.key]) navigate(vueRoutes[item.key]);
      return;
    }

    if (item.key === "simulation") {
      if (item.flux === "poste") return navigate("/app/simulation");
      const routesByFlux = {
        centre: "/app/simulation/centre",
        direction: "/app/simulation/direction",
        regional: "/app/simulation/region",
        national: "/app/simulation/national",
      };
      if (routesByFlux[item.flux]) return navigate(routesByFlux[item.flux]);
      return;
    }

    // Docs
    navigate(`/app/${sectionKey}/${item.key}`);
  };

  const SectionChip = ({ children }) => (
    <span className={`text-[13px] font-semibold px-3 py-1 rounded-md ${currentSection.chipClass}`}>
      {children}
    </span>
  );

  // Card avec option de largeur fixe
  const Card = ({ item, fixedWidth = false }) => {
    const Icon = item.icon || FileText;
    return (
      <motion.div
        onClick={() => handleCardClick(item)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.97 }}
        role="button"
        tabIndex={0}
        className={
          "group relative flex flex-col items-center justify-center text-center " +
          (fixedWidth ? "w-[260px] md:w-[300px]" : "w-full") +
          " rounded-2xl cursor-pointer bg-white/85 backdrop-blur-sm " +
          "border border-white/60 ring-1 ring-transparent " +
          "hover:ring-2 hover:ring-[#00C6FF]/70 hover:shadow-[0_12px_30px_rgba(0,123,255,0.18)] " +
          "transition-all duration-300 ease-out p-3 overflow-hidden focus-visible:outline-none " +
          "focus-visible:ring-2 focus-visible:ring-[#00C6FF]/80"
        }
        style={{ height: CARD_H }}
      >
        {/* halo */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,123,255,0.06), rgba(0,198,255,0.06))",
          }}
        />
        {/* pastille icône */}
        <div
          className="absolute -left-1.5 -top-1.5 h-8 w-8 rounded-xl
            bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white
            flex items-center justify-center shadow-[0_6px_16px_rgba(0,150,255,0.25)] border border-white/30"
        >
          <Icon className="w-4 h-4" />
        </div>
        {/* watermark */}
        <div className="absolute -bottom-1.5 -right-1 opacity-10">
          <Icon className="w-16 h-16 text-[#0074CC]" />
        </div>
        <h3 className="z-10 text-[13px] font-semibold text-[#0B2B44] leading-tight line-clamp-2 px-2 drop-shadow-sm">
          {item.title}
        </h3>
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* BG */}
      <div
        className="fixed inset-0 w-full h-full"
        style={{
          zIndex: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.8) 0%, rgba(245,250,255,0.6) 40%, rgba(235,245,255,0.3) 100%),
            linear-gradient(to bottom right, #C8E9FF 0%, #E4F4FF 50%, #F9FCFF 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(circle at 80% 20%, rgba(0,122,255,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(0,180,255,0.12) 0%, transparent 55%)",
        }}
      />

      {/* CONTENT */}
     <main
  className="relative w-full flex items-start justify-center px-4 py-6 sm:py-8"
  style={{ zIndex: 10, minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
>
        <div className="w-full max-w-[1300px] mx-auto">
          {/* GRAND TITRE — dynamique par section */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
className="force-h1 font-extrabold text-center mb-55 tracking-tight text-4xl sm:text-5xl"
          >
            <span className="inline bg-gradient-to-r from-[#005EA8] to-[#00C6FF] bg-clip-text text-transparent drop-shadow-sm">
              {currentSection.title}
            </span>{" "}
            <span className="text-[#005EA8]">TAWAZOON RH</span>
          </motion.h1>

          {/* DISPOSITION */}
          {sectionKey === "vue-globale" ? (
            // Vue Globale : 4 cartes centrées
            <div className="flex flex-wrap justify-center gap-4 sm:gap-5">
              {currentSection.items.map((item) => (
                <Card key={item.title} item={item} fixedWidth />
              ))}
            </div>
          ) : (
            // Actuel / Recommandé : 2 blocs
            <div className="space-y-6">
              {/* Bloc 1 : Simulations */}
              <div>
                <div className="mb-2 ml-1 text-[12px] font-semibold text-[#0B2B44]/70">
                  Simulations
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {simItems.map((item) => (
                    <Card key={item.title} item={item} />
                  ))}
                </div>
              </div>

              {/* Bloc 2 : Documents de process */}
              <div>
                <div className="mb-2 ml-1 text-[12px] font-semibold text-[#0B2B44]/70">
                  Documents de process
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {docItems.map((item) => (
                    <Card key={item.title} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
