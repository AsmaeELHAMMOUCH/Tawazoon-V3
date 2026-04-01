import React from "react";
import { DollarSign } from "lucide-react";

export default function ChiffrageBatchComparatifHeader() {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        flexShrink: 0,
        background: "linear-gradient(135deg, #003d7a 0%, #005EA8 50%, #0077cc 100%)",
        animation: "dlg-fade-slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-white/10 blur-2xl dlg-blob-a" />
        <div className="absolute left-1/3 -bottom-8 w-36 h-36 rounded-full bg-white/8 blur-xl dlg-blob-b" />
        <div className="absolute right-1/4 top-1/2 w-20 h-20 rounded-full bg-blue-300/10 blur-lg dlg-blob-c" />
      </div>
      <div className="relative px-6 py-3 flex items-center gap-3">
        <div
          className="dlg-icon-hover dlg-icon-enter w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-lg"
          style={{ animationDelay: "0.1s" }}
        >
          <DollarSign className="w-5 h-5 text-white" />
        </div>
        <div className="dlg-header-enter" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-lg font-black text-white tracking-tight leading-none">Chiffrage comparatif</h2>
          <p className="text-[10px] text-blue-200/80 font-medium mt-1 uppercase tracking-widest">
            Masse salariale MOD
          </p>
        </div>
      </div>
    </div>
  );
}
