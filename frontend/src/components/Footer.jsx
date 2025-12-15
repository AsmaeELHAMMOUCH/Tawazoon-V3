// src/Components/Footer.jsx
export default function Footer() {
  return (
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
  );
}