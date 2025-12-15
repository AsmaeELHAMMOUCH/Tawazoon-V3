// sections/Hero.jsx
import { motion } from "framer-motion";
import { PlayIcon } from "@heroicons/react/24/solid";

export default function Hero({ onPrimary, onDemo }) {
  return (
    <section id="accueil" className="relative overflow-hidden pt-28 sm:pt-32 pb-24 sm:pb-28">
      {/* fond grid + blobs animés */}
      <div className="absolute inset-0 -z-10 bg-center bg-cover"
           style={{ backgroundImage: "url('/background.png')" }} />
      <motion.div
        aria-hidden
        className="absolute -z-10 w-[40rem] h-[40rem] rounded-full bg-[#0a5aa8]/20 blur-3xl"
        initial={{ x: -200, y: 0, opacity: 0.4 }} animate={{ x: 40, y: -60 }} transition={{ duration: 12, repeat: Infinity, repeatType: "reverse" }}
      />
      <motion.div
        aria-hidden
        className="absolute -z-10 right-0 top-10 w-[36rem] h-[36rem] rounded-full bg-sky-200/30 blur-3xl"
        initial={{ x: 120, y: 20, opacity: 0.4 }} animate={{ x: -30, y: 40 }} transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="mx-auto max-w-5xl rounded-3xl border border-white/50 bg-white/60 backdrop-blur-md shadow-[0_10px_30px_rgba(10,90,168,0.12)] p-6 sm:p-10"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}
        >
          <div className="text-center space-y-6">
            <span className="inline-block text-sm font-medium text-[#0a5aa8] bg-[#0a5aa8]/10 px-4 py-2 rounded-full">
              Plateforme de Simulation RH
            </span>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-balance">
              Optimisez vos ressources humaines avec précision
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
              Simulez, analysez et optimisez vos effectifs pour une gestion RH efficace et stratégique.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.button
                whileTap={{ scale: .98 }} whileHover={{ y: -1 }}
                onClick={onPrimary}
                className="min-w-[240px] bg-[#0a5aa8] hover:bg-[#084a86] text-white font-semibold px-6 py-3 rounded-xl shadow"
              >
                Commencer maintenant
              </motion.button>

              <motion.a
                whileTap={{ scale: .98 }} whileHover={{ y: -1 }}
                href="#fonctionnalites"
                className="min-w-[200px] inline-flex items-center justify-center gap-2 border border-slate-300/70 bg-white hover:bg-slate-50 text-slate-900 font-semibold px-6 py-3 rounded-xl"
                onClick={onDemo}
              >
                <PlayIcon className="w-5 h-5" /> Voir la démo
              </motion.a>
            </div>

            {/* badges + stats */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-sm pt-1">
                {[
                  ["Données sécurisées", "bg-emerald-50 text-emerald-700"],
                  ["Temps réel", "bg-sky-50 text-sky-700"],
                  ["KPI prêts à l’emploi", "bg-rose-50 text-rose-700"]
                ].map(([t, cls]) => (
                  <span key={t} className={`px-3 py-2 rounded-lg border ${cls} border-black/5 text-center`}>{t}</span>
                ))}
              </div>

              <div className="bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-sm px-4 sm:px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 justify-items-center">
                  {[
                    ["95%", "Taux de satisfaction"],
                    ["40%", "Économies moyennes"],
                    ["24/7", "Support disponible"],
                  ].map(([v, l]) => (
                    <motion.div key={v} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .1 }}>
                      <div className="text-4xl font-extrabold text-[#0a5aa8] text-center">{v}</div>
                      <div className="text-sm text-slate-600 text-center">{l}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
