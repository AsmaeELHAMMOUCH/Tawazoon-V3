"use client";
import { useState } from "react";
import { Bell, ChevronDown, LogOut, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png";

export default function Header({
  className = "",
  showBurger = false, // Not used anymore but kept for prop compat
  onBurgerClick = () => { },
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={clsx(
        "flex items-center justify-between w-full h-full",
        className
      )}
    >
      {/* GAUCHE: Placeholder ou Titre page (Mobile title) */}
      <div className="flex items-center gap-2">
        {/* Logo visible only on mobile/tablet if sidebar closed? 
             Actually AppShell handles the sidebar toggle. 
             Here we just show the logo or breadcrumb. 
         */}
        <span className="md:hidden font-bold text-slate-700 text-lg tracking-tight">
          TAWAZOON RH
        </span>
      </div>

      {/* CENTRE: Logo Desktop (Optionnel) */}
      <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {/* On peut garder un logo centré discret si souhaité */}
      </div>

      {/* DROITE : Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button className="relative p-2 rounded-full hover:bg-slate-100 transition text-slate-600">
          <Bell className="w-5 h-5" />
        </button>

        {/* Profil */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition bg-white"
          >
            <div className="w-8 h-8 rounded-full bg-[#005EA8] flex items-center justify-center font-bold text-xs text-white">
              AD
            </div>

            <div className="hidden md:flex flex-col text-left mr-1">
              <span className="text-xs font-semibold text-slate-700 leading-none">Admin</span>
              <span className="text-[10px] text-slate-500 leading-none mt-0.5">Admin</span>
            </div>

            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 origin-top-right ring-1 ring-black/5"
              >
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900">Admin User</p>
                  <p className="text-xs text-slate-500 truncate">admin@almav.ma</p>
                </div>

                <div className="py-1">
                  <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Mon profil
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
