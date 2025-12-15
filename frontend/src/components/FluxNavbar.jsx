"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  GlobeAltIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const fluxOptions = [
  {
    id: "poste",
    label: "Intervenant",
    labelMobile: "Interv.",
    icon: BriefcaseIcon,
  },
  {
    id: "centre",
    label: "Centre",
    labelMobile: "Centre",
    icon: BuildingOfficeIcon,
  },
  {
    id: "direction",
    label: "Direction",
    labelMobile: "Dir.",
    icon: BuildingOfficeIcon,
  },
  {
    id: "siege",
    label: "Niveau Siège",
    labelMobile: "Siège",
    icon: MapPinIcon,
  },
  {
    id: "national",
    label: "Niveau National",
    labelMobile: "National",
    icon: GlobeAltIcon,
  },
];

export default function FluxNavbar({ activeFlux, onFluxChange }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="w-full">
      <div className="bg-white rounded-md p-1 shadow-sm mb-2 border border-slate-200">
        <div
          className="
            flex bg-slate-50 p-1 rounded-md gap-1
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
                whileTap={{ scale: 0.985 }}
                onClick={() => onFluxChange(flux.id)}
                onMouseEnter={() => setHovered(flux.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "relative flex items-center justify-center",
                  "rounded-md px-3 py-1.5",
                  "flex-shrink-0 flex-1",
                  "text-xs md:text-sm font-medium",
                  "transition-all duration-200",
                  "min-h-[32px] min-w-[80px]"
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
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  />
                )}

                {!isActive && hovered === flux.id && (
                  <motion.div
                    className="absolute inset-0 rounded-md bg-slate-200/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }}
                  />
                )}

                <div className="relative z-10 flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive ? "text-white" : "text-slate-500"
                    )}
                  />
                  <span
                    className={cn(
                      "transition-colors duration-200 whitespace-nowrap",
                      isActive ? "text-white" : "text-slate-700"
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
    </div>
  );
}
