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
  Target,
  Tag,
  Gauge,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Company from "./components/Company"; // Ajustez le chemin selon votre structure
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png";
import logoBarid from "@/assets/BaridLogo.png";
import logoAlmav from "@/assets/AlmavLogo.png";

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
      <div id="about">
        <Company />
      </div>

      {/* =======================================================
          SECTION FAQ
      ======================================================= */}
      <FaqSection />



      {/* =======================================================
          FOOTER
      ======================================================= */}
      <Footer />
    </main>
  );
}

// Composant Header
// Composant Header
function Header({ navItems, menuOpen, setMenuOpen }) {
  return (
    <header className="absolute top-6 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none">

      {/* 1. Logo Barid (Gauche) */}
      <div className="pointer-events-auto flex items-center">
        <img
          src={logoBarid}
          alt="Barid Al-Maghrib"
          className="h-20 object-contain drop-shadow-md bg-white/90 rounded-lg px-2 py-1 shadow-sm"
        />
      </div>

      {/* 2. Nav Centrée (Desktop uniquement) */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto hidden lg:block">
        <nav className="flex items-center gap-10 text-[0.9rem] text-slate-800 font-medium bg-white/90 backdrop-blur-xl rounded-full px-16 py-4 border border-white/40 shadow-xl">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="hover:text-cyan-600 transition-colors px-2 py-1 relative group"
            >
              {item.label}
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-600 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
            </a>
          ))}
        </nav>
      </div>

      {/* 3. Logo Almav + Menu Mobile (Droite) */}
      <div className="pointer-events-auto flex items-center gap-4">
        {/* Logo Almav */}
        <img
          src={logoAlmav}
          alt="Almav"
          className="h-18 object-contain drop-shadow-md hidden lg:block bg-white/90 rounded-lg px-2 py-1 shadow-sm"
        />

        {/* Bouton Menu Mobile */}
        <div className="lg:hidden pointer-events-auto">
          <button
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 w-12 h-12 bg-white/90 text-slate-800 hover:bg-white transition shadow-md backdrop-blur-md"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 4. Menu Mobile (Overlay Fullscreen) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex justify-end pointer-events-auto">
          <div className="w-full max-w-sm h-full bg-white p-6 flex flex-col gap-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <span className="text-xl font-bold text-slate-800">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-lg font-medium text-slate-800 py-3 px-2 rounded-lg hover:bg-slate-50 hover:text-cyan-600 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-auto border-t border-slate-100 pt-6">
              <a
                href="/login"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Se connecter
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}
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
      <div className="absolute inset-0 bg-white/30"></div>

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
          src={tawazoonLogo}
          alt="Tawazoon RH Glow"
          className="w-[70%] max-w-[600px] mx-auto"
        />
      </div>

      {/* Contenu de la section Accueil */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col min-h-screen pt-32 pb-10 justify-center px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center px-8 pb-8 pt-0 w-full max-w-lg bg-white/80 backdrop-blur-md rounded-3xl shadow-[0_30px_120px_rgba(0,192,255,0.15)] border border-white/50 text-center gap-0 mt-auto mb-auto">

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="flex items-center justify-center w-full -mt-8"
          >
            <img
              src={tawazoonLogo}
              alt="Tawazoon RH"
              className="w-[80%] max-w-[420px] object-contain drop-shadow-[0_0_40px_rgba(72,202,228,0.8)]"
            />
          </motion.div>

          {/* Texte et Bouton */}
          <div className="flex flex-col gap-4 w-full justify-center items-center -mt-6">
            {/* Baseline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="font-bold tracking-wide leading-snug"
            >
              <span className="text-sm sm:text-base lg:text-lg bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_20px_rgba(72,202,228,0.6)]">
                Pilotez vos effectifs avec précision
              </span>
            </motion.p>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="text-[0.65rem] leading-relaxed sm:text-[0.75rem] lg:text-xs flex flex-col gap-1"
            >
              <span className="font-bold block bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent">L’intelligence du dimensionnement.</span>
              <span className="bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent">Des effectifs calculés sur la base de données mesurables.</span>
            </motion.div>


          </div>
        </div>

        {/* Bouton - Hors du conteneur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="flex justify-center w-full -mt-12"
        >
          <a
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0077b6] to-[#48cae4] px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_40px_rgba(72,202,228,0.4)] hover:shadow-[0_10px_50px_rgba(72,202,228,0.6)] hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
          >
            Se Connecter
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

// Composant LeftColumn
// Composant LeftColumn
// Composant LeftColumn
function LeftColumn() {
  return (
    <div className="flex flex-col gap-2 w-full max-w-xs bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/50 justify-center items-center text-center">

      {/* Baseline / tagline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="font-bold tracking-wide leading-snug"
      >
        <span className="text-sm sm:text-base lg:text-lg bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_20px_rgba(72,202,228,0.6)]">
          Pilotez vos effectifs avec précision
        </span>
      </motion.p>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="text-[0.65rem] leading-relaxed sm:text-[0.75rem] lg:text-xs flex flex-col gap-1"
      >
        <span className="font-bold mt-1 block bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent">L’intelligence du dimensionnement.</span>
        <span className="bg-gradient-to-r from-[#0077b6] via-[#48cae4] to-[#0077b6] bg-clip-text text-transparent">Des effectifs calculés sur la base de données mesurables.</span>
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
        flex-col
        gap-4
        rounded-2xl
        border border-white/10
        bg-white/80
        p-6
        shadow-[0_30px_120px_rgba(0,192,255,0.15)]
      "
    >
      <div className="flex items-center justify-center w-full h-full">
        <img
          src={tawazoonLogo}
          alt="Tawazoon RH"
          className="w-[80%] max-w-[420px] object-contain drop-shadow-[0_0_40px_rgba(72,202,228,0.8)]"
        />
      </div>
    </motion.div>
  );
}
// Composant FeaturesSection
function FeaturesSection() {
  // Fonctionnalités principales de TAWAZOON RH
  const features = [
    {
      icon: <Target className="h-5 w-5 text-[#00bfff]" />,
      label: "De la réalité terrain à l'effectif cible",
      desc: (
        <>
          TAWAZOON RH calcule la charge réelle, la convertit en ETP et détermine les besoins en effectifs par métier et par site.
          Des décisions directement reliées à la réalité des opérations.
        </>
      ),
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-[#00bfff]" />,
      label: "Des normes réalistes, ancrées dans les pratiques réelles",
      desc: (
        <>
          Des normes construites à partir d’observations réelles et de chronométrages terrain,
          garantissant des résultats crédibles et applicables.
        </>
      ),
    },
    {
      icon: <Gauge className="h-5 w-5 text-[#00bfff]" />,
      label: "Prise en compte de la capacité productive réelle",
      desc: (
        <>
          Prise en compte des horaires, temps non productifs et contraintes opérationnelles
          pour des résultats homogènes et comparables entre sites
        </>
      ),
    },
    {
      icon: <GitBranch className="h-5 w-5 text-[#00bfff]" />,
      label: "Simulez, comparez, arbitrez",
      desc: (
        <>
          Comparez la situation actuelle, la consolidation et l’optimisation pour éclairer vos arbitrages RH.
        </>
      ),
    },
    {
      icon: <Tag className="h-5 w-5 text-[#00bfff]" />,
      label: "Catégorisation administrative automatique des sites",
      desc: (
        <>
          Classement objectif des sites selon volumes, activités et effectifs.
        </>
      ),
    },
    {
      icon: <Workflow className="h-5 w-5 text-[#00bfff]" />,
      label: "Organigrammes générés automatiquement",
      desc: (
        <>
          Génération d’organigrammes cibles par site, structurés par métier et par niveau.
        </>
      ),
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-[#00bfff]" />,
      label: "Une vision consolidée à l'échelle du réseau",
      desc: (
        <>
          Analyse par site, par métier et consolidée à l’échelle du réseau.
        </>
      ),
    },
    {
      icon: <Shield className="h-5 w-5 text-[#00bfff]" />,
      label: "Un outil audit-ready et durable",
      desc: (
        <>
          Résultats traçables, explicables et auditables.
        </>
      ),
    },
    {
      icon: <Gauge className="h-5 w-5 text-[#00bfff]" />,
      label: "Un véritable outil de pilotage",
      desc: (
        <>
          Un outil d’aide à la décision, pas un SIRH, au service de la performance et de la maîtrise des effectifs.
        </>
      ),
    },
  ];

  return (
    <section id="features" className="relative w-full pt-10 pb-20">
      {/* Background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        <img
          src="/barid.png"
          alt="Background"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />

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
          <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl mb-4">
            Fonctionnalités Principales
          </h2>

        </motion.div>

        {/* ===================== */}
        {/* Fonctionnalités principales */}
        {/* ===================== */}
        <div className="mb-10">
          {/* Grille des fonctionnalités */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 justify-items-center gap-4 xl:gap-6 mb-8">
            {features.map((item, i) => (
              <motion.div
                key={`feature-${i}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * i }}
                className="group rounded-xl border border-slate-200 bg-white p-4 text-center
                           backdrop-blur-xl shadow-sm
                           hover:shadow-md hover:border-[#00bfff]/30 transition-all duration-300
                           w-full h-auto flex flex-col items-center"
              >
                <div className="mb-2 flex flex-col items-center gap-2 w-full">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00bfff]/10 to-[#00ccff]/10 shadow-inner group-hover:from-[#00bfff]/20 group-hover:to-[#00ccff]/20 transition-all shrink-0">
                    {item.icon}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 leading-tight w-full">
                    {item.label}
                  </h4>
                </div>
                <div className="text-[0.7rem] text-slate-600 leading-relaxed flex-grow">
                  {item.desc}
                </div>
              </motion.div>
            ))}
          </div>
        </div>


      </div>
    </section>
  );
}


// Composant FaqSection
// Composant FaqSection
// Composant FaqItem pour l'accordéon
const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group h-full min-h-[5.5rem] rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:border-[#00bfff]/30 flex flex-col"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full flex-grow items-center justify-between p-4 text-left focus:outline-none cursor-pointer select-none"
      >
        <span className="text-slate-900 font-bold text-xs pr-4 group-hover:text-[#00bfff] transition-colors leading-tight">
          {question}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-[#00bfff] flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-[#00bfff] flex-shrink-0 transition-colors" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <div className="text-[0.65rem] text-slate-600 leading-normal border-t border-slate-100 pt-2">
            {answer}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Composant FaqSection
function FaqSection() {
  const faqs = [
    {
      question: "Sur quoi reposent les calculs de TAWAZOON RH ?",
      answer: (
        <>
          Les calculs reposent sur une chaîne causale claire et traçable :<br />
          volumes d’activité observés, temps unitaires issus des pratiques réelles, charge de travail et capacité productive.<br />
          Chaque résultat est objectivé et justifiable.
        </>
      ),
    },
    {
      question: "TAWAZOON RH utilise-t-il des ratios standards ou historiques ?",
      answer: (
        <>
          Non. TAWAZOON RH ne s’appuie pas sur des ratios génériques ni sur des effectifs hérités.<br />
          Le dimensionnement est fondé sur la charge réelle de travail, observée et mesurée sur le terrain.
        </>
      ),
    },
    {
      question: "Les résultats sont-ils auditables et défendables ?",
      answer: (
        <>
          Oui. Tous les résultats produits par TAWAZOON RH sont traçables, explicables et auditables.<br />
          Les données sources, hypothèses et paramètres de calcul sont documentés et historisés.
        </>
      ),
    },
    {
      question: "L’outil est-il adapté aux organisations multi-sites et multi-métiers ?",
      answer: (
        <>
          Oui. TAWAZOON RH est conçu pour des organisations complexes, multi-sites et multi-métiers.<br />
          Il permet une analyse par site, par métier, avec une consolidation globale à l’échelle du réseau.
        </>
      ),
    },
    {
      question: "Peut-on simuler plusieurs scénarios sans modifier les données de référence ?",
      answer: (
        <>
          Oui. L’outil permet de construire et comparer plusieurs scénarios (organisationnels, productivité, optimisation)<br />
          sans altérer le socle méthodologique ni les données de référence.
        </>
      ),
    },
    {
      question: "Comment TAWAZOON RH catégorise-t-il les sites ?",
      answer: (
        <>
          La catégorie administrative de chaque site est calculée automatiquement à partir de critères objectifs :<br />
          volumes traités, activités réalisées et effectifs nécessaires.<br />
          La catégorisation est homogène, reproductible et comparable entre sites.
        </>
      ),
    },
    {
      question: "TAWAZOON RH remplace-t-il un SIRH ?",
      answer: (
        <>
          Non. TAWAZOON RH ne remplace pas un SIRH.<br />
          Il complète les systèmes existants en apportant une capacité d’aide à la décision dédiée au dimensionnement et au pilotage des effectifs.
        </>
      ),
    },
    {
      question: "L’outil peut-il évoluer dans le temps ?",
      answer: (
        <>
          Oui. TAWAZOON RH est conçu pour être pérenne et évolutif.<br />
          Les volumes, paramètres et hypothèses peuvent être actualisés pour accompagner les évolutions de l’activité et des organisations.
        </>
      ),
    },
    {
      question: "Comment réalise-t-on une simulation dans TAWAZOON RH ?",
      answer: (
        <>
          Une simulation se déroule en quelques étapes simples et structurées :<br /><br />
          <strong>1. Introduction des volumes d’activité</strong><br />
          L’utilisateur renseigne les volumes à traiter par activité et par site.<br /><br />
          <strong>2. Définition des paramètres de productivité</strong><br />
          Le taux de productivité et les temps non productifs (temps morts, contraintes opérationnelles) sont définis ou ajustés selon le contexte étudié.<br /><br />
          <strong>3. Choix de la typologie du centre</strong><br />
          La typologie du site est sélectionnée afin d’appliquer les règles, normes et paramètres adaptés à son mode de fonctionnement.<br /><br />
          <strong>4. Lancement de la simulation</strong><br />
          TAWAZOON RH calcule automatiquement la charge de travail, la convertit en effectifs (ETP / FTE) et restitue les résultats comparatifs et scénarios associés.
        </>
      ),
    },
    {
      question: "Peut-on lancer une simulation pour plusieurs centres en même temps ?",
      answer: (
        <>
          Oui.<br />
          TAWAZOON RH permet de lancer des simulations multi-centres en important les volumes via un fichier Excel, à l’aide d’un template standard fourni par l’outil.<br />
          Une fois les volumes importés, TAWAZOON RH applique automatiquement les règles de dimensionnement, calcule les effectifs par centre et restitue une vision consolidée à l’échelle du réseau.
        </>
      ),
    },
    {
      question: "Peut-on simuler un centre qui n’est pas encore créé ?",
      answer: (
        <>
          Oui.<br />
          TAWAZOON RH permet de réaliser des simulations pour des centres non encore existants, afin d’anticiper les besoins en effectifs avant leur ouverture.<br />
          Grâce à un menu dédié, il suffit de :<br />
          • renseigner le nom du centre,<br />
          • sélectionner la typologie du centre,<br />
          • introduire les volumes prévisionnels.<br />
          TAWAZOON RH calcule alors automatiquement l’effectif requis, en cohérence avec les normes de dimensionnement et les paramètres de productivité.
        </>
      ),
    },
  ];

  return (
    <section
      id="faq"
      className="relative w-full min-h-0 flex flex-col justify-center py-4"
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80 pointer-events-none"
        style={{ backgroundImage: "url('/bg-barid-esign.jpg')" }}
      />
      <div className="absolute inset-0 bg-white/60 pointer-events-none"></div>

      {/* Contenu */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Titre global */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-2 text-center"
        >
          <div className="inline-block bg-black/60 backdrop-blur-sm rounded-2xl px-5 py-2 border border-white/10 shadow-lg">
            <h2 className="text-lg font-bold text-white sm:text-xl mb-0.5 tracking-wide drop-shadow-md">
              FAQ
            </h2>
            <p className="text-[0.65rem] font-medium text-slate-100 drop-shadow-md">
              Réponses aux questions fréquentes
            </p>
          </div>
        </motion.div>

        {/* Liste des FAQ en grille pour compactage */}
        {/* Liste des FAQ en deux colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {faqs.map((faq, i) => (
            <div key={`faq-${i}`} className="w-full h-full">
              <FaqItem question={faq.question} answer={faq.answer} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}



// Composant Footer
function Footer() {
  return (
    <footer className="relative w-full border-t border-slate-200 bg-white px-4 py-6 text-center text-slate-600 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">

          {/* Logo et informations */}
          <div className="flex items-center gap-3">
            <img
              src={tawazoonLogo}
              alt="Tawazoon RH"
              className="h-9 object-contain"
            />
            <div className="text-left">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                TAWAZOON RH
              </h3>
            </div>
          </div>

          {/* Liens utiles */}
          <div className="flex flex-wrap justify-center gap-4 md:gap-8">
            <a
              href="#home"
              className="text-slate-500 hover:text-[#00bfff] transition-colors text-sm font-medium"
            >
              Accueil
            </a>
            <a
              href="#features"
              className="text-slate-500 hover:text-[#00bfff] transition-colors text-sm font-medium"
            >
              Fonctionnalités
            </a>
            <a
              href="#about"
              className="text-slate-500 hover:text-[#00bfff] transition-colors text-sm font-medium"
            >
              Qui sommes-nous ?
            </a>
            <a
              href="#faq"
              className="text-slate-500 hover:text-[#00bfff] transition-colors text-sm font-medium"
            >
              FAQ
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-400 whitespace-nowrap">
            © {new Date().getFullYear()} ALMAV GROUP
          </div>
        </div>
      </div>
    </footer>
  );
}
