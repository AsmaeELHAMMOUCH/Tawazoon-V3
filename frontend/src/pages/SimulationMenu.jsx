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
  Sparkles,
  History,
  PiggyBank,
  Scale
} from "lucide-react";

const CHIP_BLUE =
  "bg-[linear-gradient(90deg,#007BFF_0%,#00C6FF_100%)] text-white shadow-[0_2px_10px_rgba(0,150,255,0.35)] ring-1 ring-white/30";

const HEADER_HEIGHT = 96;
const CARD_H = 120;

export default function MenuAnalyseEffectifs() {
  const navigate = useNavigate();
  const { section } = useParams();
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
      title: "Menu de simulation",
      chipClass: CHIP_BLUE,
      items: [
        { icon: Layers, title: "Tableau De Bord Global", key: "tableau" },
        { icon: BarChart, title: "Ratios", key: "ratios" },
        { icon: PiggyBank, title: "Économies budgétaires Estimées", key: "economies" },
        { icon: Scale, title: "Comparatif Positions", key: "comparatif" },
        { icon: History, title: "Historique Simulations", key: "history" },
      ],
    },
    actuel: {
      key: "actuel",
      title: "Processus Actuel",
      chipClass: CHIP_BLUE,
      items: [
        { icon: UserCog, title: "Simulation Par Intervenant", key: "simulation", flux: "poste" },
        { icon: ClipboardList, title: "Simulation Par Centre", key: "simulation", flux: "centre" },
        { icon: Building, title: "Simulation par Direction", key: "simulation", flux: "direction" },
        { icon: Users, title: "Simulation par Région", key: "simulation", flux: "regional" },
        { icon: Building, title: "Simulation Nationale", key: "simulation", flux: "national" },
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
        { icon: UserCog, title: "Simulation Par Intervenant", key: "simulation", flux: "poste" },
        { icon: ClipboardList, title: "Simulation Par Centre", key: "simulation", flux: "centre" },
        { icon: Building, title: "Simulation par Direction", key: "simulation", flux: "direction" },
        { icon: Users, title: "Simulation par Région", key: "simulation", flux: "regional" },
        { icon: Building, title: "Simulation Nationale", key: "simulation", flux: "national" },
        { icon: FileText, title: "Capacité Nominale", key: "capacite-nominale" },
        { icon: ListChecks, title: "Normes", key: "normes" },
        { icon: BookText, title: "Référentiel", key: "referentiel" },
        { icon: Workflow, title: "Schéma", key: "schema" },
        { icon: TimerReset, title: "Chronogramme", key: "chronogramme" },
      ],
    },
  };

  const currentSection = sectionsMap[sectionKey];

  const { simItems, docItems } = useMemo(() => {
    if (sectionKey === "vue-globale")
      return { simItems: currentSection.items, docItems: [] };

    const sims = currentSection.items.filter((i) => i.key === "simulation");
    const docs = currentSection.items.filter((i) => i.key !== "simulation");
    return { simItems: sims, docItems: docs };
  }, [sectionKey, currentSection]);

  const handleCardClick = (item) => {
    if (sectionKey === "vue-globale") {
      const vueRoutes = {
        tableau: "/app/vue-globale/tableau",
        ratios: "/app/vue-globale/ratios",
        economies: "/app/vue-globale/economies-budgetaires",
        comparatif: "/app/vue-globale/comparatif",
        history: "/app/simulations/history",
      };
      if (vueRoutes[item.key]) navigate(vueRoutes[item.key]);
      return;
    }

    if (item.key === "simulation") {
      // Pour tous les flux, y compris "poste", passer le flux dans le state
      if (item.flux === "poste") {
        return navigate("/app/simulation", { state: { flux: "poste" } });
      }

      const routesByFlux = {
        centre: "/app/simulation/centre",
        direction: "/app/simulation/direction",
        regional: "/app/simulation/region",
        national: "/app/simulation/national",
      };

      if (routesByFlux[item.flux]) {
        return navigate(routesByFlux[item.flux], { state: { flux: item.flux } });
      }
      return;
    }


    navigate(`/app/${sectionKey}/${item.key}`);
  };

  // Card améliorée avec effets WOW
  const Card = ({ item, fixedWidth = false }) => {
    const Icon = item.icon || FileText;
    return (
      <motion.div
        onClick={() => handleCardClick(item)}
        whileHover={{
          scale: 1.06,
          y: -8,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        }}
        whileTap={{ scale: 0.95 }}
        role="button"
        tabIndex={0}
        className={
          "group relative flex flex-col items-center justify-center text-center " +
          (fixedWidth ? "w-[260px] md:w-[300px]" : "w-full") +
          " rounded-2xl cursor-pointer bg-white/90 backdrop-blur-xl " +
          "border border-white/80 ring-1 ring-transparent " +
          "hover:ring-2 hover:ring-[#00C6FF]/80 hover:shadow-[0_20px_60px_rgba(0,123,255,0.25)] " +
          "transition-all duration-300 ease-out p-3 overflow-hidden focus-visible:outline-none " +
          "focus-visible:ring-2 focus-visible:ring-[#00C6FF]/80"
        }
        style={{ height: CARD_H }}
      >
        {/* Gradient animé au hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,123,255,0.08), rgba(0,198,255,0.12))",
          }}
        />

        {/* Particules brillantes */}
        <motion.div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
          initial={{ scale: 0, rotate: 0 }}
          whileHover={{ scale: 1, rotate: 180 }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="w-4 h-4 text-[#00C6FF]" />
        </motion.div>

        {/* Pastille icône avec animation */}
        <motion.div
          className="absolute -left-1.5 -top-1.5 h-10 w-10 rounded-xl
            bg-[linear-gradient(135deg,#007BFF_0%,#00C6FF_100%)] text-white
            flex items-center justify-center shadow-[0_8px_24px_rgba(0,150,255,0.35)] 
            border-2 border-white/40 group-hover:border-white/60"
          whileHover={{ rotate: 360, scale: 1.1 }}
          transition={{ duration: 0.6, type: "spring" }}
        >
          <Icon className="w-5 h-5" />
        </motion.div>

        {/* Watermark avec effet parallax */}
        <motion.div
          className="absolute -bottom-2 -right-2 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300"
          whileHover={{ scale: 1.1, rotate: 5 }}
        >
          <Icon className="w-20 h-20 text-[#0074CC]" />
        </motion.div>

        {/* Titre avec meilleure lisibilité */}
        <h3 className="z-10 text-[13px] font-bold text-[#0B2B44] leading-tight line-clamp-2 px-2 
          drop-shadow-sm group-hover:text-[#007BFF] transition-colors duration-300">
          {item.title}
        </h3>

        {/* Barre de progression subtile au hover */}
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[#007BFF] to-[#00C6FF] rounded-b-2xl"
          initial={{ width: 0 }}
          whileHover={{ width: "100%" }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    );
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background avec effet de profondeur */}
      <div
        className="fixed inset-0 w-full h-full"
        style={{
          zIndex: 0,
          background: `
            radial-gradient(circle at 20% 30%, rgba(255,255,255,0.9) 0%, rgba(245,250,255,0.7) 40%, rgba(235,245,255,0.4) 100%),
            linear-gradient(to bottom right, #C8E9FF 0%, #E4F4FF 50%, #F9FCFF 100%)
          `,
        }}
      />

      {/* Orbes lumineux animés */}
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 1 }}
        animate={{
          background: [
            "radial-gradient(circle at 80% 20%, rgba(0,122,255,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(0,180,255,0.12) 0%, transparent 55%)",
            "radial-gradient(circle at 70% 30%, rgba(0,122,255,0.18) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(0,180,255,0.15) 0%, transparent 55%)",
            "radial-gradient(circle at 80% 20%, rgba(0,122,255,0.15) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(0,180,255,0.12) 0%, transparent 55%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* CONTENT */}
      <main
        className="relative w-full flex items-start justify-center px-4 py-6 sm:py-8"
        style={{ zIndex: 10, minHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
      >
        <div className="w-full max-w-[1300px] mx-auto">
          {/* TITRE avec animation spectaculaire */}
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.6,
              type: "spring",
              stiffness: 100,
              damping: 15
            }}
            className="text-center mb-8"
          >
            <motion.h1
              className="force-h1 font-extrabold tracking-tight text-4xl sm:text-5xl relative inline-block"
              whileHover={{ scale: 1.02 }}
            >
              <span className="inline bg-gradient-to-r from-[#005EA8] via-[#007BFF] to-[#00C6FF] bg-clip-text text-transparent drop-shadow-lg">
                {currentSection.title}
              </span>{" "}
              <span className="text-[#005EA8]">TAWAZOON RH</span>

              {/* Effet de brillance */}
              <motion.div
                className="absolute -inset-2 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-xl"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.h1>
          </motion.div>

          {/* DISPOSITION avec animations en cascade */}
          {sectionKey === "vue-globale" ? (
            <motion.div
              className="flex flex-wrap justify-center gap-4 sm:gap-5"
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.1,
                  },
                },
              }}
            >
              {currentSection.items.map((item, idx) => (
                <motion.div
                  key={item.title}
                  variants={{
                    hidden: { opacity: 0, y: 50, scale: 0.8 },
                    visible: { opacity: 1, y: 0, scale: 1 },
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    delay: idx * 0.1
                  }}
                >
                  <Card item={item} fixedWidth />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="space-y-6">
              {/* Simulations */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="mb-3 ml-1 text-[13px] font-bold text-[#0B2B44]/80 uppercase tracking-wide flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-[#007BFF] to-[#00C6FF] rounded-full" />
                  Simulations
                </div>
                <motion.div
                  className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.08,
                      },
                    },
                  }}
                >
                  {simItems.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.9 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                    >
                      <Card item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              {/* Documents */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="mb-3 ml-1 text-[13px] font-bold text-[#0B2B44]/80 uppercase tracking-wide flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-[#007BFF] to-[#00C6FF] rounded-full" />
                  Documents de process
                </div>
                <motion.div
                  className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: {
                        staggerChildren: 0.08,
                        delayChildren: 0.4,
                      },
                    },
                  }}
                >
                  {docItems.map((item, idx) => (
                    <motion.div
                      key={item.title}
                      variants={{
                        hidden: { opacity: 0, y: 30, scale: 0.9 },
                        visible: { opacity: 1, y: 0, scale: 1 },
                      }}
                    >
                      <Card item={item} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
