"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Globe,
  MapPin,
  Building2,
  Building,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fluxOptions = [
  {
    id: "poste",
    label: "Intervenant",
    labelMobile: "Interv.",
    icon: User,
  },
  {
    id: "centre",
    label: "Centre",
    labelMobile: "Centre",
    icon: Building,
  },
  {
    id: "direction",
    label: "Direction Régionale",
    labelMobile: "Dir. Rég.",
    icon: Building2,
  },
  {
    id: "siege",
    label: "Niveau Siège",
    labelMobile: "Siège",
    icon: MapPin,
  },
  {
    id: "national",
    label: "Niveau National",
    labelMobile: "National",
    icon: Globe,
  },
];

export default function FluxNavbar({ activeFlux, onFluxChange }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="w-full">
      <div className="bg-white/80 backdrop-blur-sm rounded-lg p-0.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-0.5 border border-slate-200">
        <div
          className="
            flex bg-slate-50/50 p-0.5 rounded-md gap-0.5
            overflow-x-auto md:overflow-visible
            scrollbar-hide
          "
        >
          {fluxOptions.map((flux) => {
            const isActive = activeFlux === flux.id;
            const Icon = flux.icon;

            return (
              <motion.button
                key={flux.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onFluxChange(flux.id)}
                onMouseEnter={() => setHovered(flux.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative flex items-center justify-center",
                  "rounded-md px-3 py-1.5",
                  "flex-shrink-0 flex-1",
                  "text-[11px] md:text-xs font-semibold uppercase tracking-wide",
                  "transition-all duration-200",
                  "min-h-[28px] min-w-[80px]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="fluxPill"
                    className="
                      absolute inset-0 rounded-md
                      bg-[#005EA8]
                      shadow-sm
                    "
                    transition={{ type: "spring", damping: 25, stiffness: 400 }}
                  />
                )}

                {!isActive && hovered === flux.id && (
                  <motion.div
                    className="absolute inset-0 rounded-md bg-slate-200/50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-1.5">
                  <Icon
                    size={14}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn(
                      "transition-colors duration-200",
                      isActive ? "text-white" : "text-slate-500"
                    )}
                  />
                  <span
                    className={cn(
                      "transition-colors duration-200 whitespace-nowrap",
                      isActive ? "text-white" : "text-slate-600"
                    )}
                  >
                    <span className="md:hidden">{flux.labelMobile}</span>
                    <span className="hidden md:inline">{flux.label}</span>
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div >
  );
}
