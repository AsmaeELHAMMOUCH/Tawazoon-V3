"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Users,
  BarChart3,
  Shield,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  User,
  TrendingUp,
  PieChart,
  PiggyBank,
  TrendingDown,
  GitBranch,
  Layers,
  ClipboardList,
  Clock,
  BookOpen,
  Workflow,
} from "lucide-react";
import Company from "./components/Company"; // Ajustez le chemin selon votre structure

// Composant ChartMock
function ChartMock({ title = "Activité globale" }) {
  return (
    <div className="w-full h-40 md:h-52 rounded-xl border border-white/5 bg-[rgba(10,10,10,0.25)] backdrop-blur-[1px] flex flex-col justify-between p-5 text-slate-200 text-sm shadow-[0_10px_50px_rgba(0,0,0,0.45)]">
      {/* Titre */}
      <div className="flex items-center justify-between text-[0.8rem] text-slate-300">
        <span>{title}</span>
      </div>

      {/* Mini faux graph */}
      <div className="flex-1 flex items-end gap-2 mt-4">
        {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm 
                       bg-gradient-to-t from-[#0077b6]/40 to-[#48cae4]/90 
                       shadow-[0_0_20px_rgba(72,202,228,0.6)]
                       transition-transform duration-300 hover:scale-y-105"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function GradientCheckIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#check-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="check-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0077b6" />
          <stop offset="100%" stopColor="#48cae4" />
        </linearGradient>
      </defs>

      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

// Composant principal Accueil
export default function Accueil() {
  // État pour le menu mobile
  const [menuOpen, setMenuOpen] = useState(false);

  // Navigation items
  const navItems = [
    { label: "Accueil", href: "#home" },
    { label: "Fonctionnalités", href: "#features" },
    { label: "Qui sommes-nous ?", href: "#about" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* =======================================================
          NAVBAR / HEADER
      ======================================================= */}
      <Header
        navItems={navItems}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
      />

      {/* =======================================================
          SECTION ACCUEIL (HERO)
      ======================================================= */}
      <HeroSection />

      {/* =======================================================
          SECTION FONCTIONNALITÉS
      ======================================================= */}
      <FeaturesSection />

      {/* =======================================================
          SECTION QUI SOMMES-NOUS
      ======================================================= */}
      <Company />

      {/* =======================================================
          SECTION FAQ
      ======================================================= */}
      <FaqSection />

      {/* =======================================================
          SECTION CTA FINAL
      ======================================================= */}
      <FinalCtaSection />

      {/* =======================================================
          FOOTER
      ======================================================= */}
      <Footer />
    </main>
  );
}

// Composant Header
function Header({ navItems, menuOpen, setMenuOpen }) {
  return (
    <header className="absolute top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-8">
      <div
        className="w-full max-w-7xl flex items-center rounded-2xl border border-white/10
        bg-white/[0.04] backdrop-blur-xl shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]
        px-4 sm:px-6 h-14 md:h-16 relative"
      >
        {/* Logo et texte */}
        <div className="flex items-center gap-3 sm:gap-4">
          <img
            src="/Public/LOGO_Tawazoon_RH.png"
            alt="Tawazoon RH"
            className="h-8 sm:h-10 object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.7)]"
          />
          <div className="flex flex-col leading-tight">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0077b6] to-[#48cae4] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(72,202,228,0.4)]">
              TAWAZOON RH
            </h1>

            <div className="text-[0.7rem] text-slate-400 sm:text-[0.8rem]">
              Optimisation des effectifs
            </div>
          </div>
        </div>

        {/* Navigation desktop */}
        <nav className="hidden md:flex ml-8 lg:ml-12 gap-8 text-[0.9rem] text-slate-200">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-white transition-colors flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-white/10"
            >
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        {/* Menu mobile */}
        <div className="ml-auto flex items-center gap-3">
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/20
  w-12 h-12 text-slate-200 hover:bg-white/10 transition"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Menu mobile déroulant */}
        {menuOpen && (
          <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-black/50 flex items-start justify-center pt-20 px-4">
            <div
              className="w-full max-w-md rounded-2xl border border-white/30 bg-white/100 backdrop-blur-md
      shadow-[0_30px_120px_-20px_rgba(0,0,0,0.9)] p-6 flex flex-col gap-4 text-[1rem] text-slate-800"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between py-3 px-4 rounded-lg
          text-slate-900 hover:text-cyan-600 hover:bg-gray-100 border border-transparent
          hover:border-cyan-200 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="text-[1.1rem] font-medium">
                    {item.label}
                  </span>
                  <span className="text-[1rem] text-cyan-600">→</span>
                </a>
              ))}
              <div className="border-t border-gray-300 my-3" />
              <a
                href="/login"
                className="w-full inline-flex items-center justify-center text-[1.1rem] font-medium
  bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg
  px-4 py-2.5 shadow-md hover:shadow-lg transition-shadow"
                onClick={() => setMenuOpen(false)}
              >
                Se connecter
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// Composant HeroSection
function HeroSection() {
  return (
    <section
      id="home"
      className="relative min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: "url('/img/bg-barid-esign.jpg')" }}
    >
      {/* Couche transparente */}
      <div className="absolute inset-0 bg-black/60"></div>

      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Glow logo principal en fond */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 flex items-center justify-center opacity-[0.08] blur-[80px] md:blur-[100px]"
      >
        <img
          src="/public/LOGO_Tawazoon_RH.png"
          alt="Tawazoon RH Glow"
          className="w-[70%] max-w-[600px] mx-auto"
        />
      </div>

      {/* Contenu de la section Accueil */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-24 px-4 pb-32 pt-24 sm:px-6 lg:px-8 lg:pt-32">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2">
          {/* Colonne GAUCHE */}
          <LeftColumn />

          {/* Colonne DROITE */}
          <RightColumn />
        </div>
      </div>
    </section>
  );
}

// Composant LeftColumn
function LeftColumn() {
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Badge sécurité */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-3 inline-flex items-center gap-2 w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] text-slate-200 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        style={{
          background: "linear-gradient(135deg, #0077b6 0%, #48cae4 100%)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Shield className="h-3.5 w-3.5 text-white" />
        <span>Données sécurisées & centralisées</span>
      </motion.div>

      {/* Baseline / tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="font-bold tracking-wide leading-snug"
      >
        <span className="text-2xl sm:text-4xl bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_20px_rgba(72,202,228,0.6)]">
          Simulation RH multi-centres • Pilotage opérationnel
        </span>
      </motion.p>

      {/* Titre */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="text-3xl font-semibold leading-[1.15] text-white sm:text-4xl lg:text-5xl"
      >
        Optimisez vos effectifs
        <br />
        <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-white bg-clip-text text-transparent"></span>
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="text-lg leading-relaxed text-slate-300 sm:text-xl lg:text-2xl"
      >
        Votre simulateur RH analyse les volumes, la productivité et les tâches
        critiques pour recommander l’effectif idéal par centre, par poste et par
        activité. Fini les estimations au feeling — prenez des décisions basées
        sur des données opérationnelles.
      </motion.p>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        {/* Bouton Se Connecter — même gradient que le badge */}
        <a
          href="/login"
          className="group inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#0077b6] to-[#48cae4] px-5 py-3 text-base font-semibold text-white shadow-[0_10px_40px_rgba(72,202,228,0.4)] hover:shadow-[0_10px_50px_rgba(72,202,228,0.6)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
        >
          Se Connecter
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </a>

        {/* Bouton Voir un exemple — compact aussi */}
        <a
          href="#demo"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-3 text-base font-semibold text-white backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)] hover:bg-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          Voir un exemple
          <ChevronRight className="h-4 w-4" />
        </a>
      </motion.div>

      {/* Garanties */}
      <motion.ul
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-200"
      >
        <li className="flex  gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#48cae4] drop-shadow-[0_0_6px_rgba(72,202,228,0.5)]" />
          Sans tableur complexe
        </li>

        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#48cae4] drop-shadow-[0_0_6px_rgba(72,202,228,0.5)]" />
          Projection FTE exacte
        </li>

        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[#48cae4] drop-shadow-[0_0_6px_rgba(72,202,228,0.5)]" />
          Compatible multi-centres
        </li>
      </motion.ul>

      {/* Partenaires / logos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.3 }}
        className="mt-21 flex w-full justify-center"
      >
        <div
          className="w-full max-w-[700px] sm:max-w-[900px] rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl
    shadow-[0_30px_120px_rgba(0,0,0,0.8)] p-5 flex flex-col items-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-14 sm:gap-20">
            {/* ALMAV */}
            <div className="flex flex-col items-center gap-2">
              <img
                src="/public/almav.png"
                alt="ALMAV"
                className="h-12 sm:h-14 object-contain drop-shadow-[0_0_25px_rgba(255,0,0,0.6)]"
              />
              <span className="text-[0.7rem] text-slate-400 uppercase tracking-wide">
                ALMAV
              </span>
            </div>

            {/* BARID AL-MAGHRIB */}
            <div className="flex flex-col items-center gap-2">
              <img
                src="/public/BaridLogo.png"
                alt="Groupe Barid Al-Maghrib"
                className="h-12 sm:h-14 object-contain bg-white rounded-md p-1 drop-shadow-[0_0_25px_rgba(0,102,255,0.6)]"
              />
              <span className="text-[0.7rem] text-slate-400 uppercase tracking-wide text-center">
                Barid Al-Maghrib
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Composant RightColumn
function RightColumn() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="
        relative
        mx-auto
        flex
        w-full
        max-w-[900px]      /* <= ICI on élargit */
        flex-col
        gap-4
        rounded-2xl
        border border-white/10
        bg-white/[0.03]
        p-5 pb-4
        backdrop-blur-xl
        shadow-[0_30px_120px_rgba(0,192,255,0.15)]
      "
    >
      {/* KPIs */}
      <div className="grid w-full grid-cols-3 gap-4 text-center">
        <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4 text-slate-200 shadow-inner shadow-white/5">
          <div className="text-[0.8rem] text-slate-400">Effectif actuel</div>
          
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4 text-slate-200 shadow-inner shadow-white/5">
          <div className="text-[0.8rem] text-slate-400">Recommandé</div>
          
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.07] p-4 text-slate-200 shadow-inner shadow-white/5">
          <div className="text-[0.8rem] text-slate-400">Écart global</div>
          
        </div>
      </div>

      {/* Graph 1 */}
      <ChartMock title="FTE Actuel" />

      {/* Graph 2 */}
      <ChartMock title="Temps par Tache" />
    </motion.div>
  );
}
// Composant FeaturesSection
function FeaturesSection() {
  // Bloc 1 : Outils de pilotage / avantages
  const features = [
    {
      icon: <Users className="h-5 w-5 text-[#00bfff]" />,
      label: "Dimensionnement par poste",
      value: "Poste par poste",
      desc: "Identifiez précisément les sur-effectifs et les besoins en ressources.",
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-[#00bfff]" />,
      label: "Analyse de productivité",
      value: "Heures réelles",
      desc: "Basée sur les durées unitaires d'activité et les volumes traités.",
    },
    {
      icon: <Shield className="h-5 w-5 text-[#00bfff]" />,
      label: "Traçabilité",
      value: "Audit-ready",
      desc: "Justifiez chaque recommandation avec des calculs clairs et vérifiables.",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-[#00bfff]" />,
      label: "Décision rapide",
      value: "-30% de temps",
      desc: "Finis les allers-retours avec des tableaux Excel complexes.",
    },
    {
      icon: <PiggyBank className="h-5 w-5 text-[#00bfff]" />,
      label: "Économies Budgétaires",
      desc: "Estimations précises des gains potentiels",
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-[#00bfff]" />,
      label: "Comparatif Positions",
      desc: "Vue d'ensemble des écarts par centre",
    },
  ];

  // Bloc 3 : Résultats de simulation
  const simulationResults = [
    {
      icon: <ClipboardList className="h-5 w-5 text-[#00bfff]" />,
      label: "Normes de dimensionnement",
      desc: "Standards par activité et centre",
    },
    {
      icon: <Clock className="h-5 w-5 text-[#00bfff]" />,
      label: "Chronogramme de Traitement",
      desc: "Temps unitaire par tâche détaillé",
    },
    {
      icon: <BookOpen className="h-5 w-5 text-[#00bfff]" />,
      label: "Référentiel",
      desc: "Base documentaire complète",
    },
    {
      icon: <Workflow className="h-5 w-5 text-[#00bfff]" />,
      label: "Schéma Process",
      desc: "Cartographie des flux opérationnels",
    },
    {
      icon: <Layers className="h-5 w-5 text-[#00bfff]" />,
      label: "Analyse Multi-niveaux",
      desc: "Du global au détail par poste",
    },
    {
      icon: <GitBranch className="h-5 w-5 text-[#00bfff]" />,
      label: "Scénarios Comparatifs",
      desc: "Simulation de plusieurs hypothèses",
    },
  ];

  return (
    <section id="features" className="relative w-full pt-10 pb-20">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-slate-950/98 to-black" />
        <div className="absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Contenu */}
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Titre global */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl mb-4">
            Fonctionnalités
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Des outils complets pour piloter vos effectifs avec précision
          </p>
        </motion.div>

        {/* ===================== */}
        {/* Bloc : Vos Outils de Pilotage */}
        {/* ===================== */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="h-1 w-12 bg-gradient-to-r from-[#00bfff] to-[#00ccff] rounded-full"></span>
            Vos Outils de Pilotage
          </h3>
          {/* Grille 1 : features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center gap-6 xl:gap-8 mb-8">
            {features.map((item, i) => (
              <motion.div
                key={`feature-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left
                           backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                           hover:bg-white/[0.05] hover:border-[#00bfff]/30 transition-all duration-300
                           w-full h-[150px] flex flex-col"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00bfff]/10 to-[#00ccff]/10 shadow-inner shadow-white/5 group-hover:from-[#00bfff]/20 group-hover:to-[#00ccff]/20 transition-all">
                    {item.icon}
                  </span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                {item.value && (
                  <div className="text-lg font-semibold text-white mb-2">
                    {item.value}
                  </div>
                )}
                <div className="text-xs text-slate-400 leading-relaxed flex-grow">
                  {item.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bloc : Résultats de la Simulation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="h-1 w-12 bg-gradient-to-r from-[#00bfff] to-[#00ccff] rounded-full"></span>
            Résultats de la Simulation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center gap-6 xl:gap-8">
            {simulationResults.map((item, i) => (
              <motion.div
                key={`simulation-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="group rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl
                           shadow-[0_10px_40px_rgba(0,0,0,0.5)] p-5
                           hover:bg-white/[0.05] hover:border-[#00bfff]/30 transition-all duration-300
                           w-full h-[150px] flex flex-col"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#00bfff]/10 to-[#00ccff]/10 shadow-inner shadow-white/5 shrink-0 group-hover:from-[#00bfff]/20 group-hover:to-[#00ccff]/20 transition-all">
                    {item.icon}
                  </span>
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold text-white mb-1">
                      {item.label}
                    </div>
                    <div className="text-xs text-slate-400 leading-relaxed">
                      {item.desc}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// Composant FaqSection
// Composant FaqSection
function FaqSection() {
  const faqs = [
    {
      question: "Comment est calculé l’effectif recommandé ?",
      answer:
        "On prend tes volumes réels (sacs, colis, opérations), les temps unitaires d’exécution par tâche, la productivité cible et le temps net dispo par ressource. On en déduit l’ETP nécessaire par poste et par centre.",
    },
    {
      question: "Est-ce que c’est auditable ?",
      answer:
        "Oui. Chaque recommandation vient avec le détail des tâches, volumes et temps. Tu peux défendre face à la direction ou à un audit qualité.",
    },
    {
      question: "On peut l’utiliser pour plusieurs centres ?",
      answer:
        "Oui. Le modèle supporte multi-centres et multi-activités, avec comparaison d’écart entre l’effectif actuel et l’effectif cible.",
    },
  ];

  return (
    <section
      id="faq"
      className="relative w-full py-16"
    >
      {/* Background (identique à FeaturesSection) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-slate-950/98 to-black" />
        <div className="absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Contenu */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Titre global */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <h2 className="text-2xl font-bold text-white sm:text-3xl mb-4">
            FAQ
          </h2>
          <p className="text-base text-slate-400 max-w-2xl mx-auto">
            Réponses aux questions fréquentes
          </p>
        </motion.div>

        {/* Liste des FAQ */}
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={`faq-${i}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 text-left
                         backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]
                         hover:bg-white/[0.05] hover:border-[#00bfff]/30 transition-all duration-300"
            >
              <div className="text-white font-medium text-lg mb-3">
                {faq.question}
              </div>
              <div className="text-sm text-slate-400 leading-relaxed">
                {faq.answer}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Composant FinalCtaSection
function FinalCtaSection() {
  return (
    <section className="relative w-full py-16">
      {/* Background (identique aux autres sections) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-slate-950/98 to-black" />
        <div className="absolute -left-40 top-20 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute -right-40 top-60 h-[28rem] w-[28rem] rounded-full bg-[#00bfff]/15 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* Contenu */}
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] sm:p-8"
        >
          {/* Soft glow */}
          <div
            aria-hidden
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#00bfff]/10 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#0077b6]/10 blur-[120px]"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold text-white sm:text-3xl mb-2">
                Passe du feeling aux faits
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Rentre tes volumes. Lance la simulation. Obtiens l'effectif
                recommandé. Défends ton besoin RH avec un argumentaire béton.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/app"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0077b6] to-[#48cae4] px-6 py-3 text-sm font-medium text-white shadow-[0_10px_40px_rgba(72,202,228,0.4)] hover:shadow-[0_10px_50px_rgba(72,202,228,0.6)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
              >
                Lancer une simulation
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm font-medium text-white backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-white/[0.08] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                Voir un exemple PDF
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Composant Footer
function Footer() {
  return (
    <footer className="relative w-full border-t border-white/10 bg-slate-950/40 px-4 py-8 text-center text-slate-400 sm:px-6 lg:px-8">
      {/* Background subtil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-slate-950/98 to-black opacity-50" />
        <div className="absolute inset-0 opacity-[0.03] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        {/* Logo et informations */}
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Public/LOGO_Tawazoon_RH.png"
              alt="Tawazoon RH"
              className="h-10 object-contain drop-shadow-[0_0_10px_rgba(0,212,255,0.5)]"
            />
            <div className="text-left">
              <h3 className="text-lg font-bold bg-gradient-to-r from-[#0077b6] to-[#48cae4] bg-clip-text text-transparent">
                TAWAZOON RH
              </h3>
              <p className="text-[0.8rem]">Optimisation des effectifs</p>
            </div>
          </div>

          <div className="text-sm text-slate-400">
            © {new Date().getFullYear()} ALMAV GROUP • Tous droits réservés.
          </div>
        </div>

        {/* Liens utiles */}
        <div className="mt-6 flex flex-col gap-4 sm:flex-row justify-center">
          <a
            href="#home"
            className="text-slate-300 hover:text-white transition-colors text-sm"
          >
            Accueil
          </a>
          <a
            href="#features"
            className="text-slate-300 hover:text-white transition-colors text-sm"
          >
            Fonctionnalités
          </a>
          <a
            href="#about"
            className="text-slate-300 hover:text-white transition-colors text-sm"
          >
            Qui sommes-nous ?
          </a>
          <a
            href="#faq"
            className="text-slate-300 hover:text-white transition-colors text-sm"
          >
            FAQ
          </a>
        </div>
      </div>
    </footer>
  );
}
