"use client"
import { useNavigate } from "react-router-dom"
import { useState, useRef } from "react"
import { motion, useMotionValue, useTransform } from "framer-motion"
import {
  LayoutDashboard,
  Zap,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import tawazoonLogo from "@/assets/LOGO_Tawazoon_RH.png"

export default function Sidebar({
  onLogout,
  activeTab,
  collapsed = false,
  onToggle,
}) {
  const navigate = useNavigate()
  const [hoveredItem, setHoveredItem] = useState(null)

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Vue globale",path: "/dashboard" },
    { id: "simulation", label: "Simulation", icon: Zap,description: "Flux en cascade" , path: "/simulation" },
    { id: "comparatif", label: "Comparatif", icon: BarChart3,description: "Comparer Actuel vs Recommandé", path: "/comparatif" },
    { id: "resultats", label: "Résultats", icon: FileText,  description: "Détails par niveau",path: "/resultats" },
  ]




  return (
    <aside
      className={cn(
        "h-screen text-slate-800 flex flex-col border-r border-slate-200 shadow-md",
        "bg-gradient-to-b from-white to-slate-50/70 backdrop-blur-sm transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* --- HEADER LOGO --- */}
      <div className="h-16 flex items-center justify-between px-4 bg-gradient-to-r from-[#005EA8]/30 to-[#0A6BBC]/60 text-white">
        <div className="flex items-center gap-3">
          <img src={tawazoonLogo} alt="Logo" className="w-9 h-9 rounded-md bg-white/20" />
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold">TAWAZOON RH</h1>
              <p className="text-[11px] text-blue-100">Gestion des Effectifs</p>
            </div>
          )}
        </div>
        <button onClick={onToggle} className="p-1 rounded-md hover:bg-white/10">
          <ChevronRight className={cn("w-4 h-4 transition-transform", !collapsed && "rotate-180")} />
        </button>
      </div>

      {/* --- MENU --- */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {menuItems.map((item) => {
          const active = activeTab === item.id
          const isHovered = hoveredItem === item.id

          // Motion values pour effet magnétique
          const x = useMotionValue(0)
          const y = useMotionValue(0)
          const rotateX = useTransform(y, [-10, 10], [8, -8])
          const rotateY = useTransform(x, [-10, 10], [-8, 8])

          const handleMouseMove = (event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            const xPos = event.clientX - bounds.left - bounds.width / 2
            const yPos = event.clientY - bounds.top - bounds.height / 2
            x.set(xPos / 4)
            y.set(yPos / 4)
          }

          const handleMouseLeave = () => {
            setHoveredItem(null)
            x.set(0)
            y.set(0)
          }

          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
              className={cn(
                "relative w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all mb-2 group overflow-hidden",
                collapsed ? "px-2 py-2 justify-center" : "px-4 py-3",
                active
                  ? "bg-[#005EA8] text-white shadow-lg"
                  : "text-gray-700 hover:bg-[#005EA8]/10 hover:text-[#005EA8]"
              )}
              style={{ perspective: 600 }}
            >
              {/* --- Effet halo lumineux sur icône active --- */}
              {active && (
                <motion.div
                  layoutId="activeHalo"
                  className="absolute inset-0 rounded-lg border-2 border-[#0070D4]/50 shadow-[0_0_12px_rgba(0,112,212,0.6)]"
                />
              )}

              {/* --- Icône avec effet magnétique --- */}
              <motion.div
                style={{
                  rotateX,
                  rotateY,
                }}
                transition={{ type: "spring", stiffness: 150, damping: 12 }}
                className="relative z-10"
              >
                <motion.div
                  animate={
                    isHovered
                      ? { scale: 1.15, rotate: 6, color: "#005EA8" }
                      : { scale: 1, rotate: 0, color: active ? "#fff" : "#374151" }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                </motion.div>
              </motion.div>

              {/* --- Label texte --- */}
              {!collapsed && (
                <motion.span
                  initial={{ x: 0, opacity: 1 }}
                  animate={{ x: isHovered ? 3 : 0, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                  className="relative z-10"
                >
                  <div>{item.label}</div>
                <div className={cn("text-xs", activeTab === item.id ? "text-blue-100" : "text-gray-500")}>
                  {item.description}
                </div>

                </motion.span>
              )}
            </motion.button>
          )
        })}
      </nav>

      {/* --- FOOTER --- */}
      <div className="border-t border-slate-200 p-3">
        <button
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all",
            collapsed ? "px-2 py-2 justify-center" : "px-4 py-3"
          )}
        >
          <Settings className="w-5 h-5" />
          {!collapsed && <span>Paramètres</span>}
        </button>
        <button
          onClick={onLogout}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all",
            collapsed ? "px-2 py-2 justify-center" : "px-4 py-3"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
