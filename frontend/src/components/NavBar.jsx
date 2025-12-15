// components/NavBar.jsx
import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@heroicons/react/24/solid";

export default function NavBar({ onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <nav className={[
      "fixed inset-x-0 top-0 z-50 transition-all border-b",
      scrolled ? "bg-white/80 backdrop-blur-md border-slate-200" : "bg-transparent border-transparent"
    ].join(" ")}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/LOGO_Tawazoon_RH.png" className="w-9 h-9 rounded bg-white" alt="" />
          <span className="text-lg font-extrabold tracking-tight">TAWAZOON RH</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="#accueil" className="hover:text-slate-900 text-slate-600">Accueil</a>
          <a href="#qui-sommes-nous" className="hover:text-slate-900 text-slate-600">Qui sommes-nous</a>
          <a href="#fonctionnalites" className="hover:text-slate-900 text-slate-600">Fonctionnalités</a>
          <a href="#faq" className="hover:text-slate-900 text-slate-600">FAQ</a>
        </div>
        <button
          onClick={onLogin}
          className="inline-flex items-center gap-2 bg-[#0a5aa8] hover:bg-[#084a86] text-white font-semibold px-4 py-2 rounded-xl shadow-sm transition"
        >
          Se connecter <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
