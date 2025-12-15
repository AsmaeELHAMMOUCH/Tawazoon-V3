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
} from "lucide-react";

function ChartMock({ title = "Activité globale" }) {
  return (
    <div className="w-full h-32 md:h-40 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm flex flex-col justify-between p-4 text-slate-200 text-xs shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between text-[0.7rem] text-slate-300">
        <span>{title}</span>
        <span className="inline-flex items-center gap-1 text-slate-200"></span>
      </div>

      {/* mini faux graph */}
      <div className="flex-1 flex items-end gap-1 mt-3">
        {[40, 60, 35, 80, 55, 90, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-gradient-to-t from-cyan-600/30 to-cyan-300/70 shadow-[0_0_20px_rgba(34,211,238,0.5)]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="flex justify-between text-[0.7rem] text-slate-400 mt-3"></div>
    </div>
  );
}

export default function Accueil() {
  // État pour le menu mobile
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: "Accueil", href: "#home" },
    { label: "Fonctionnalités", href: "#features" },
    { label: "Qui sommes-nous ?", href: "#about" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <main
      className="relative min-h-screen overflow-hidden 
bg-[radial-gradient(circle_at_20%_20%,rgba(0,160,224,0.14)_0%,rgba(18,35,59,0)_70%)]
bg-[#073572] text-white"
    >
      {/* -------------------------------------------------
          NAVBAR / HEADER
      ------------------------------------------------- */}
      <header className="absolute top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-8">
        <div
          className="w-full max-w-7xl flex items-center rounded-2xl border border-white/10
          bg-white/[0.04] backdrop-blur-xl shadow-[0_30px_120px_-20px_rgba(0,0,0,0.8)]
          px-4 sm:px-6 h-14 md:h-16 relative"
        >
          {/* ---------- Bloc gauche : Logo + texte produit ---------- */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Logo Tawazoon */}
            <img
              src="/Public/LOGO_Tawazoon_RH.png"
              alt="Tawazoon RH"
              className="h-6 sm:h-8 object-contain drop-shadow-[0_0_15px_rgba(0,212,255,0.7)]"
            />

            <div className="flex flex-col leading-tight">
              <div className="text-[0.75rem] font-semibold tracking-wide text-cyan-300/90">
                TAWAZOON RH
              </div>
              <div className="text-[0.6rem] text-slate-400">
                Optimisation des effectifs
              </div>
            </div>
          </div>

          {/* ---------- Navigation desktop ---------- */}
          <nav className="hidden md:flex ml-6 lg:ml-10 gap-6 text-[0.8rem] text-slate-200">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-white transition-colors flex items-center gap-1"
              >
                <span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* ---------- Côté droit ---------- */}
          <div className="ml-auto flex items-center gap-3">
          

         

            {/* Burger menu (mobile) */}
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/20
              w-10 h-10 text-slate-200 hover:bg-white/10 transition"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
            >
              {menuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* ---------- Menu mobile déroulant ---------- */}
          {menuOpen && (
            <div className="absolute top-[3.5rem] left-0 right-0 md:hidden px-2 sm:px-4">
              <div
                className="rounded-2xl border border-white/10 bg-white/[0.07] backdrop-blur-xl
                shadow-[0_30px_120px_-20px_rgba(0,0,0,0.9)] p-4 flex flex-col gap-2 text-sm"
              >
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between py-2 px-3 rounded-lg
                    text-slate-200 hover:text-white hover:bg-white/10 border border-transparent
                    hover:border-white/10 transition"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] text-slate-400">→</span>
                  </a>
                ))}

                <div className="border-t border-white/10 my-2" />

                <a
                  href="/login"
                  className="w-full inline-flex items-center justify-center text-[13px] font-medium
                  bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg
                  px-3.5 py-2.5 hover:shadow-[0_20px_60px_-10px_rgba(0,192,255,.6)]
                  transition-shadow"
                  onClick={() => setMenuOpen(false)}
                >
                  Se connecter
                  <ArrowRight className="h-4 w-4 ml-1" />
                </a>

                <div
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2
                  text-[0.7rem] text-slate-300 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.7)] mt-2"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.9)]"></span>
                  </span>
                  <span>En Ligne</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* -------------------------------------------------
          BACKGROUND GLOW GLOBAL
      ------------------------------------------------- */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20 overflow-hidden"
      >
        {/* blobs */}
        <div className="absolute -left-40 top-0 h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-[120px]" />
        {/* grille subtile */}
        <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,#ffffff_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      {/* -------------------------------------------------
          GLOW LOGO PRINCIPAL EN FOND (wow)
      ------------------------------------------------- */}
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

      {/* WRAPPER GLOBAL */}
      <div className="relative mx-auto flex max-w-7xl flex-col gap-24 px-4 pb-32 pt-24 sm:px-6 lg:px-8 lg:pt-32">
        {/* =======================================================
            HERO SECTION
        ======================================================= */}
        <section
          id="home"
          className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2"
        >
          {/* ---------- Colonne GAUCHE ---------- */}
          <div className="flex flex-col gap-6 max-w-xl">
            {/* badge sécurité */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[0.7rem] text-slate-200 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
            >
              <Shield className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-slate-200">
                Données sécurisées & centralisées
              </span>
            </motion.div>

            {/* baseline / tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="text-[0.7rem] font-medium tracking-wide text-cyan-300/80"
            >
              Simulation RH multi-centres • Pilotage opérationnel
            </motion.p>

            {/* titre */}
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

            {/* description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 }}
              className="text-base leading-relaxed text-slate-300 sm:text-lg"
            >
              Votre simulateur RH analyse les volumes, la productivité et les
              tâches critiques pour recommander l’effectif idéal par centre, par
              poste et par activité. Fini les estimations au feeling — prenez
              des décisions basées sur des données opérationnelles.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <a
                href="/login"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-[0_20px_60px_rgba(0,192,255,0.4)] hover:shadow-[0_20px_70px_rgba(0,192,255,0.6)] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                Se Connecter
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>

              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                Voir un exemple
                <ChevronRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* garanties */}
            <motion.ul
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.25 }}
              className="mt-4 flex flex-col gap-3 text-xs text-slate-300 sm:flex-row sm:flex-wrap"
            >
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Sans tableur complexe
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Projection FTE exacte
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                Compatible multi-centres
              </li>
            </motion.ul>

            {/* Partenaires / logos */}
  <motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, delay: 0.3 }}
  className="mt-10 flex justify-center w-full"
>
  <div
    className="w-[460px] sm:w-[520px] rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-xl
    shadow-[0_30px_120px_rgba(0,0,0,0.8)] p-4 sm:p-5 flex flex-col items-center"
  >
    <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-14">
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

          {/* ---------- Colonne DROITE ---------- */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 pb-4 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,192,255,0.15)] sm:max-w-md"
          >
            {/* KPIs */}
            <div className="grid w-full grid-cols-3 gap-3 text-center text-xs">
              {/* carte Effectif actuel */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3 text-slate-200 shadow-inner shadow-white/5">
                <div className="text-[0.65rem] text-slate-400">
                  Effectif actuel
                </div>
                <div className="text-lg font-semibold text-white">148</div>
              </div>
              {/* carte Recommandé */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3 text-slate-200 shadow-inner shadow-white/5">
                <div className="text-[0.65rem] text-slate-400">Recommandé</div>
                <div className="text-lg font-semibold text-emerald-300">
                  132
                </div>
              </div>
              {/* carte Écart global */}
              <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3 text-slate-200 shadow-inner shadow-white/5">
                <div className="text-[0.65rem] text-slate-400">
                  Écart global
                </div>
                <div className="text-lg font-semibold text-cyan-300">-16</div>
              </div>
            </div>

            {/* Graph 1 */}
            <ChartMock title="FTE Actuel" />

            {/* Graph 2 */}
            <ChartMock title="Temps par Tache" />
            {/* ⬅ on a supprimé le petit texte du bas */}
          </motion.div>
        </section>

        {/* =======================================================
            KPIs / VALUE PROPS
        ======================================================= */}
        <section
          id="features"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              icon: <Users className="h-4 w-4 text-cyan-300" />,
              label: "Dimensionnement par poste",
              value: "Poste par poste",
              desc: "Tu sais exactement où tu sur-staffes ou manques de ressources.",
            },
            {
              icon: <BarChart3 className="h-4 w-4 text-cyan-300" />,
              label: "Analyse de productivité",
              value: "Heures réelles",
              desc: "Basée sur les durées unitaires d’activité et les volumes traités.",
            },
            {
              icon: <Shield className="h-4 w-4 text-cyan-300" />,
              label: "Traçabilité",
              value: "Audit-ready",
              desc: "Justifie chaque recommandation avec des calculs clairs.",
            },
            {
              icon: <CheckCircle2 className="h-4 w-4 text-cyan-300" />,
              label: "Décision rapide",
              value: "-30% d’allers-retours Excel",
              desc: "Finis les tableaux qu’on met à jour à la main.",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.7)]"
            >
              <div className="mb-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.07] shadow-inner shadow-white/5">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              <div className="text-base font-semibold text-white">
                {item.value}
              </div>
              <div className="text-[0.8rem] text-slate-400 leading-relaxed">
                {item.desc}
              </div>
            </motion.div>
          ))}
        </section>

        {/* =======================================================
            SECTION PARTENAIRES / QUI SOMMES-NOUS
        ======================================================= */}
        <section id="about" className="flex flex-col gap-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Qui sommes-nous ?
            </h2>
            <p className="text-slate-400 text-sm max-w-xl leading-relaxed mx-auto mt-2">
              Tawazoon RH est une initiative orientée terrain : dimensionnement
              des équipes, traçabilité des charges, pilotage opérationnel. Nous
              travaillons avec les responsables d’activité pour traduire le réel
              en besoin RH clair, défendable et chiffré.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-10 items-center">
            <div className="flex flex-col items-center gap-2">
              <img
                src="/public/almav.png"
                alt="ALMAV"
                className="h-12 object-contain drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]"
              />
              <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
                ALMAV
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <img
                src="/public/BaridLogo.png"
                alt="Groupe Barid Al-Maghrib"
                className="h-12 object-contain drop-shadow-[0_0_20px_rgba(0,102,255,0.5)] bg-white rounded-sm p-1"
              />
              <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide text-center">
                Barid Al-Maghrib
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <img
                src="/public/LOGO_Tawazoon_RH.png"
                alt="Tawazoon RH"
                className="h-14 object-contain drop-shadow-[0_0_28px_rgba(0,212,255,0.7)]"
              />
              <span className="text-[0.7rem] text-slate-500 uppercase tracking-wide">
                Tawazoon RH
              </span>
            </div>
          </div>
        </section>

        {/* =======================================================
            FAQ
        ======================================================= */}
        <section
  id="faq"
  className="flex flex-col gap-6 max-w-3xl mx-auto items-center text-center"
>
  <h2 className="text-xl font-semibold text-white sm:text-2xl">FAQ</h2>

  <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
    <div className="text-white font-medium text-sm">
      Comment est calculé l’effectif recommandé ?
    </div>
    <div className="text-[0.8rem] text-slate-400 leading-relaxed mt-2">
      On prend tes volumes réels (sacs, colis, opérations), les temps unitaires
      d’exécution par tâche, la productivité cible et le temps net dispo par
      ressource. On en déduit l’ETP nécessaire par poste et par centre.
    </div>
  </div>

  <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
    <div className="text-white font-medium text-sm">
      Est-ce que c’est auditable ?
    </div>
    <div className="text-[0.8rem] text-slate-400 leading-relaxed mt-2">
      Oui. Chaque recommandation vient avec le détail des tâches, volumes et
      temps. Tu peux défendre face à la direction ou à un audit qualité.
    </div>
  </div>

  <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.7)]">
    <div className="text-white font-medium text-sm">
      On peut l’utiliser pour plusieurs centres ?
    </div>
    <div className="text-[0.8rem] text-slate-400 leading-relaxed mt-2">
      Oui. Le modèle supporte multi-centres et multi-activités, avec comparaison
      d’écart entre l’effectif actuel et l’effectif cible.
    </div>
  </div>
</section>


        {/* =======================================================
            CTA FINAL
        ======================================================= */}
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-800/20 p-6 shadow-[0_30px_120px_rgba(0,192,255,0.15)] backdrop-blur-xl sm:p-10">
          {/* soft glow */}
          <div
            aria-hidden
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-[120px]"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-[120px]"
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Passe du feeling aux faits
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Rentre tes volumes. Lance la simulation. Obtiens l’effectif
                recommandé. Défends ton besoin RH avec un argumentaire béton.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/app"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-3 text-sm font-medium text-white shadow-[0_20px_60px_rgba(0,192,255,0.4)] hover:shadow-[0_20px_70px_rgba(0,192,255,0.6)] focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
              >
                Lancer une simulation
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>

              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.6)] hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
              >
                Voir un exemple PDF
              </a>
            </div>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="relative border-t border-white/10 bg-slate-950/40 px-4 py-8 text-center text-[0.7rem] text-slate-500 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-slate-400">
            Tawazoon RH • Optimisation des effectifs • Pilotage opérationnel
          </div>
          <div className="mt-2 text-slate-600">
            © {new Date().getFullYear()} ALMAV GROUP/ Tous droits réservés.
          </div>
        </div>
      </footer>
    </main>
  );
}
